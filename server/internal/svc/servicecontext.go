package svc

import (
	"context"
	"fmt"
	"sync"
	"time"

	"admin-server/internal/config"
	"admin-server/internal/model"

	"github.com/zeromicro/go-zero/core/logx"
	"github.com/zeromicro/go-zero/core/stores/redis"
	"github.com/zeromicro/go-zero/core/stores/sqlx"
)

type ServiceContext struct {
	Config config.Config
	DB      sqlx.SqlConn
	Redis   *redis.Redis

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
	return &ServiceContext{
		Config:    c,
		DB:        conn,
		Redis:     rds,
		permCache: &permCache{items: make(map[int64]permCacheEntry)},
	}
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