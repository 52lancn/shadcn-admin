package svc

import (
	"context"
	"fmt"
	"sync"
	"time"

	"admin-server/internal/config"
	"admin-server/internal/model"
	"admin-server/pkg/llm"

	"github.com/zeromicro/go-zero/core/logx"
	"github.com/zeromicro/go-zero/core/stores/redis"
	"github.com/zeromicro/go-zero/core/stores/sqlx"
)

type ServiceContext struct {
	Config config.Config
	DB      sqlx.SqlConn
	Redis   *redis.Redis

	// LLM is the shared OpenAI-compatible client used by every AI feature.
	// It degrades to the built-in local engine when unconfigured, so callers
	// never have to nil-check it.
	LLM *llm.Client

	// simple in-process permission cache (TTL 30s) to avoid hitting db on every protected request
	permCache *permCache
}

type permCacheEntry struct {
	perms []string
	ts    time.Time
}

type permCache struct {
	mu    sync.RWMutex
	items map[int64]permCacheEntry
}

func (c *permCache) get(uid int64) ([]string, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()
	v, ok := c.items[uid]
	if !ok || time.Since(v.ts) > 30*time.Second {
		return nil, false
	}
	return v.perms, true
}

func (c *permCache) set(uid int64, perms []string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.items[uid] = permCacheEntry{perms: perms, ts: time.Now()}
}

func (c *permCache) invalidate(uid int64) {
	c.mu.Lock()
	defer c.mu.Unlock()
	delete(c.items, uid)
}

func NewServiceContext(c config.Config) *ServiceContext {
	conn := c.SqlxConn()
	rds := c.RedisClient()
	// soft ping: a single SQL SELECT to verify connectivity; non-fatal on failure
	if err := pingDB(context.Background(), conn); err != nil {
		logx.Errorf("mysql ping failed: %v", err)
	}
	client := llm.New(llm.Options{
		BaseURL: c.AI.BaseURL,
		APIKey:  c.AI.APIKey,
		Model:   c.AI.Model,
		Timeout: time.Duration(c.AI.Timeout) * time.Second,
	})
	if client.Enabled() {
		logx.Infof("ai module: vendor=%s model=%s", client.Vendor(), client.Model())
	} else {
		logx.Infof("ai module: no BaseURL/APIKey configured, running on the built-in local fallback engine")
	}
	return &ServiceContext{
		Config:    c,
		DB:        conn,
		Redis:     rds,
		LLM:       client,
		permCache: &permCache{items: make(map[int64]permCacheEntry)},
	}
}

// AIStatus describes the current model wiring for the front-end status card.
// It never leaks the API key.
func (s *ServiceContext) AIStatus() map[string]interface{} {
	return map[string]interface{}{
		"enabled":    s.LLM.Enabled(),
		"vendor":     s.LLM.Vendor(),
		"model":      s.LLM.Model(),
		"temperature": s.Config.AI.Temperature,
		"maxTokens":  s.Config.AI.MaxTokens,
		"record":     s.Config.AI.Record,
		// A friendly hint so an operator knows exactly what to fill in.
		"hint": aiHint(s.LLM.Enabled()),
	}
}

func aiHint(enabled bool) string {
	if enabled {
		return "已接入真实模型"
	}
	return "未配置 BaseURL/APIKey，当前由本地兜底引擎生成；填入 admin-api.yaml 的 AI 配置即可切换到 DeepSeek / 通义 / Kimi / GLM / Ollama 等任意 OpenAI 兼容模型"
}

func pingDB(ctx context.Context, conn sqlx.SqlConn) error {
	var v int
	if err := conn.QueryRowCtx(ctx, &v, "SELECT 1"); err != nil {
		return err
	}
	return nil
}

// UserPermissions collects permission codes for the given user.
// super-admin (role code = "admin") gets ["*"].
func (s *ServiceContext) UserPermissions(ctx context.Context, uid int64) ([]string, error) {
	if v, ok := s.permCache.get(uid); ok {
		return v, nil
	}
	roleIDs, err := model.ListUserRoles(ctx, s.DB, uid)
	if err != nil {
		return nil, err
	}
	if len(roleIDs) == 0 {
		// still safe: empty perms
		perms := []string{}
		s.permCache.set(uid, perms)
		return perms, nil
	}
	// if any role is the super admin role, return wildcard
	for _, rid := range roleIDs {
		r, err := model.GetRoleByID(ctx, s.DB, rid)
		if err == nil && r.Code == "admin" {
			s.permCache.set(uid, []string{"*"})
			return []string{"*"}, nil
		}
	}
	roleMenuIDs, err := s.fetchRoleMenuIDs(ctx, roleIDs)
	if err != nil {
		return nil, err
	}
	perms, err := model.ListMenuButtonPermsByIDs(ctx, s.DB, roleMenuIDs)
	if err != nil {
		return nil, err
	}
	s.permCache.set(uid, perms)
	return perms, nil
}

func (s *ServiceContext) fetchRoleMenuIDs(ctx context.Context, roleIDs []int64) ([]int64, error) {
	var all []int64
	seen := make(map[int64]bool)
	for _, rid := range roleIDs {
		ids, err := model.ListRoleMenus(ctx, s.DB, rid)
		if err != nil {
			return nil, fmt.Errorf("list role menus: %w", err)
		}
		for _, id := range ids {
			if !seen[id] {
				seen[id] = true
				all = append(all, id)
			}
		}
	}
	return all, nil
}

// InvalidateUserPerms should be called after role/menu changes.
func (s *ServiceContext) InvalidateUserPerms(uid int64) {
	s.permCache.invalidate(uid)
}

// UserMenuIDs returns the deduplicated menu id list for the user.
func (s *ServiceContext) UserMenuIDs(ctx context.Context, uid int64) ([]int64, error) {
	roleIDs, err := model.ListUserRoles(ctx, s.DB, uid)
	if err != nil {
		return nil, err
	}
	if len(roleIDs) == 0 {
		return []int64{}, nil
	}
	menuIDs, err := s.fetchRoleMenuIDs(ctx, roleIDs)
	if err != nil {
		return nil, err
	}
	seen := make(map[int64]bool, len(menuIDs))
	dedup := make([]int64, 0, len(menuIDs))
	for _, id := range menuIDs {
		if !seen[id] {
			seen[id] = true
			dedup = append(dedup, id)
		}
	}
	return dedup, nil
}