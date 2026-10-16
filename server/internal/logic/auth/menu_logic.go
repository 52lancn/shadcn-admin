package auth

import (
	"context"
	"errors"
	"sort"

	"admin-server/internal/model"
	"admin-server/internal/svc"
	"admin-server/internal/types"
	"admin-server/pkg/ctxx"

	"github.com/zeromicro/go-zero/core/logx"
)

type UserMenuLogic struct {
	logx.Logger
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewUserMenuLogic(ctx context.Context, svcCtx *svc.ServiceContext) *UserMenuLogic {
	return &UserMenuLogic{Logger: logx.WithContext(ctx), ctx: ctx, svcCtx: svcCtx}
}

// UserMenus builds the menu tree for the current user.
func (l *UserMenuLogic) UserMenus() ([]*types.MenuVO, error) {
	uid := ctxx.UID(l.ctx)
	if uid == 0 {
		return nil, errors.New("no user in context")
	}
	roleIDs, err := model.ListUserRoles(l.ctx, l.svcCtx.DB, uid)
	if err != nil {
		return nil, err
	}
	// super admin gets every menu
	var menus []*model.Menu
	isAdmin := false
	for _, rid := range roleIDs {
		r, e := model.GetRoleByID(l.ctx, l.svcCtx.DB, rid)
		if e == nil && r.Code == "admin" {
			isAdmin = true
			break
		}
	}
	if isAdmin {
		menus, err = model.ListMenus(l.ctx, l.svcCtx.DB, "", "1")
		if err != nil {
			return nil, err
		}
	} else {
		menuIDs, err := l.svcCtx.UserMenuIDs(l.ctx, uid)
		if err != nil {
			return nil, err
		}
		menus, err = model.ListMenuByIDs(l.ctx, l.svcCtx.DB, menuIDs)
		if err != nil {
			return nil, err
		}
	}
	// filter: only directories and menus (not buttons), visible=1, status=1
	filtered := make([]*model.Menu, 0, len(menus))
	for _, m := range menus {
		if m.Status != 1 || m.Visible != 1 {
			continue
		}
		if m.Type == 3 {
			continue
		}
		filtered = append(filtered, m)
	}
	return buildMenuTree(filtered), nil
}

func buildMenuTree(menus []*model.Menu) []*types.MenuVO {
	nodeMap := make(map[int64]*types.MenuVO, len(menus))
	roots := make([]*types.MenuVO, 0)
	for _, m := range menus {
		nodeMap[m.ID] = &types.MenuVO{
			ID:        m.ID,
			ParentID:  m.ParentID,
			Name:       m.Name,
			Path:        m.Path,
			Component: m.Component,
			Redirect:    m.Redirect,
			Icon:        m.Icon,
			Type:        m.Type,
			Perms:       m.Perms,
			Sort:        m.Sort,
			Visible:     m.Visible,
			Status:      m.Status,
			Children:    []*types.MenuVO{},
		}
	}
	for _, m := range menus {
		node := nodeMap[m.ID]
		if m.ParentID == 0 {
			roots = append(roots, node)
		} else if parent, ok := nodeMap[m.ParentID]; ok {
			parent.Children = append(parent.Children, node)
		} else {
			// orphan: treat as root
			roots = append(roots, node)
		}
	}
	sort.SliceStable(roots, func(i, j int) bool { return roots[i].Sort < roots[j].Sort })
	for _, r := range roots {
		sortTree(r)
	}
	return roots
}

func sortTree(n *types.MenuVO) {
	if len(n.Children) == 0 {
		return
	}
	sort.SliceStable(n.Children, func(i, j int) bool { return n.Children[i].Sort < n.Children[j].Sort })
	for _, c := range n.Children {
		sortTree(c)
	}
}