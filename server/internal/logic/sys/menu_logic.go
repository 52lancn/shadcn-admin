package sys

import (
	"context"
	"errors"
	"sort"

	"admin-server/internal/model"
	"admin-server/internal/svc"
	"admin-server/internal/types"

	"github.com/zeromicro/go-zero/core/logx"
)

type MenuLogic struct {
	logx.Logger
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewMenuLogic(ctx context.Context, svcCtx *svc.ServiceContext) *MenuLogic {
	return &MenuLogic{Logger: logx.WithContext(ctx), ctx: ctx, svcCtx: svcCtx}
}

func (l *MenuLogic) List(keyword, status string) ([]*types.MenuVO, error) {
	menus, err := model.ListMenus(l.ctx, l.svcCtx.DB, keyword, status)
	if err != nil {
		return nil, err
	}
	out := make([]*types.MenuVO, 0, len(menus))
	for _, m := range menus {
		out = append(out, &types.MenuVO{
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
		})
	}
	return buildTree(out), nil
}

func (l *MenuLogic) Get(id int64) (*types.MenuVO, error) {
	m, err := model.GetMenuByID(l.ctx, l.svcCtx.DB, id)
	if err != nil {
		return nil, err
	}
	return &types.MenuVO{
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
	}, nil
}

func (l *MenuLogic) Create(req *types.MenuSaveReq) error {
	m := &model.Menu{
		ParentID:  req.ParentID,
		Name:       req.Name,
		Path:        req.Path,
		Component: req.Component,
		Redirect:    req.Redirect,
		Icon:        req.Icon,
		Type:        orType(req.Type, 2),
		Perms:       req.Perms,
		Sort:        req.Sort,
		Visible:     orDefault(req.Visible, 1),
		Status:      orDefault(req.Status, 1),
	}
	_, err := model.CreateMenu(l.ctx, l.svcCtx.DB, m)
	return err
}

func (l *MenuLogic) Update(req *types.MenuSaveReq) error {
	if req.ID == 0 {
		return errors.New("id is required")
	}
	m := &model.Menu{
		ID:        req.ID,
		ParentID:  req.ParentID,
		Name:       req.Name,
		Path:        req.Path,
		Component: req.Component,
		Redirect:    req.Redirect,
		Icon:        req.Icon,
		Type:        orType(req.Type, 2),
		Perms:       req.Perms,
		Sort:        req.Sort,
		Visible:     orDefault(req.Visible, 1),
		Status:      orDefault(req.Status, 1),
	}
	return model.UpdateMenu(l.ctx, l.svcCtx.DB, m)
}

func (l *MenuLogic) Delete(id int64) error {
	return model.DeleteMenu(l.ctx, l.svcCtx.DB, id)
}

// ---- helpers ----

func orType(v, def int) int {
	if v == 0 {
		return def
	}
	return v
}

func buildTree(menus []*types.MenuVO) []*types.MenuVO {
	nodeMap := make(map[int64]*types.MenuVO, len(menus))
	roots := make([]*types.MenuVO, 0)
	for _, m := range menus {
		m.Children = []*types.MenuVO{}
		nodeMap[m.ID] = m
	}
	for _, m := range menus {
		if m.ParentID == 0 {
			roots = append(roots, m)
		} else if parent, ok := nodeMap[m.ParentID]; ok {
			parent.Children = append(parent.Children, m)
		} else {
			roots = append(roots, m)
		}
	}
	sort.SliceStable(roots, func(i, j int) bool { return roots[i].Sort < roots[j].Sort })
	for _, r := range roots {
		sortRec(r)
	}
	return roots
}

func sortRec(n *types.MenuVO) {
	if len(n.Children) == 0 {
		return
	}
	sort.SliceStable(n.Children, func(i, j int) bool { return n.Children[i].Sort < n.Children[j].Sort })
	for _, c := range n.Children {
		sortRec(c)
	}
}