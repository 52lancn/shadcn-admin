package sys

import (
	"context"
	"errors"

	"admin-server/internal/model"
	"admin-server/internal/svc"
	"admin-server/internal/types"
	"admin-server/pkg/response"

	"github.com/zeromicro/go-zero/core/logx"
)

type RoleLogic struct {
	logx.Logger
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewRoleLogic(ctx context.Context, svcCtx *svc.ServiceContext) *RoleLogic {
	return &RoleLogic{Logger: logx.WithContext(ctx), ctx: ctx, svcCtx: svcCtx}
}

func (l *RoleLogic) List(req *types.PageReq) (*response.PageData, error) {
	if req.Page <= 0 {
		req.Page = 1
	}
	if req.PerPage <= 0 || req.PerPage > 200 {
		req.PerPage = 10
	}
	roles, total, err := model.ListRoles(l.ctx, l.svcCtx.DB, req.Page, req.PerPage, req.Keyword, req.Status)
	if err != nil {
		return nil, err
	}
	out := make([]*types.RoleVO, 0, len(roles))
	for _, r := range roles {
		menuIDs, _ := model.ListRoleMenus(l.ctx, l.svcCtx.DB, r.ID)
		out = append(out, &types.RoleVO{
			ID:        r.ID,
			Code:      r.Code,
			Name:      r.Name,
			Sort:      r.Sort,
			Status:    r.Status,
			Remark:    r.Remark,
			MenuIDs:   menuIDs,
			CreatedAt: formatTime(r.CreatedAt),
		})
	}
	return &response.PageData{List: out, Total: total, Page: req.Page, PerPage: req.PerPage}, nil
}

func (l *RoleLogic) Get(id int64) (*types.RoleVO, error) {
	r, err := model.GetRoleByID(l.ctx, l.svcCtx.DB, id)
	if err != nil {
		return nil, err
	}
	menuIDs, _ := model.ListRoleMenus(l.ctx, l.svcCtx.DB, r.ID)
	return &types.RoleVO{
		ID:      r.ID,
		Code:    r.Code,
		Name:    r.Name,
		Sort:    r.Sort,
		Status:  r.Status,
		Remark:  r.Remark,
		MenuIDs: menuIDs,
		CreatedAt: formatTime(r.CreatedAt),
	}, nil
}

func (l *RoleLogic) Create(req *types.RoleSaveReq) error {
	if req.Code == "" || req.Name == "" {
		return errors.New("code and name are required")
	}
	r := &model.Role{
		Code:   req.Code,
		Name:   req.Name,
		Sort:   req.Sort,
		Status: orDefault(req.Status, 1),
		Remark: req.Remark,
	}
	rid, err := model.CreateRole(l.ctx, l.svcCtx.DB, r)
	if err != nil {
		return err
	}
	if len(req.MenuIDs) > 0 {
		return model.ReplaceRoleMenus(l.ctx, l.svcCtx.DB, rid, req.MenuIDs)
	}
	return nil
}

func (l *RoleLogic) Update(req *types.RoleSaveReq) error {
	if req.ID == 0 {
		return errors.New("id is required")
	}
	r := &model.Role{
		ID:     req.ID,
		Code:   req.Code,
		Name:   req.Name,
		Sort:   req.Sort,
		Status: orDefault(req.Status, 1),
		Remark: req.Remark,
	}
	if err := model.UpdateRole(l.ctx, l.svcCtx.DB, r); err != nil {
		return err
	}
	return model.ReplaceRoleMenus(l.ctx, l.svcCtx.DB, r.ID, req.MenuIDs)
}

func (l *RoleLogic) Delete(id int64) error {
	return model.DeleteRole(l.ctx, l.svcCtx.DB, id)
}

func (l *RoleLogic) Options() ([]*types.RoleVO, error) {
	roles, err := model.ListAllRoles(l.ctx, l.svcCtx.DB)
	if err != nil {
		return nil, err
	}
	out := make([]*types.RoleVO, 0, len(roles))
	for _, r := range roles {
		out = append(out, &types.RoleVO{ID: r.ID, Code: r.Code, Name: r.Name, Status: r.Status})
	}
	return out, nil
}

func (l *RoleLogic) AssignMenus(req *types.AssignRoleMenusReq) error {
	return model.ReplaceRoleMenus(l.ctx, l.svcCtx.DB, req.RoleID, req.MenuIDs)
}