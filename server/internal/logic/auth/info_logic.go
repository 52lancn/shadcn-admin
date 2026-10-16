package auth

import (
	"context"
	"errors"

	"admin-server/internal/model"
	"admin-server/internal/svc"
	"admin-server/internal/types"
	"admin-server/pkg/ctxx"

	"github.com/zeromicro/go-zero/core/logx"
)

type UserInfoLogic struct {
	logx.Logger
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewUserInfoLogic(ctx context.Context, svcCtx *svc.ServiceContext) *UserInfoLogic {
	return &UserInfoLogic{Logger: logx.WithContext(ctx), ctx: ctx, svcCtx: svcCtx}
}

func (l *UserInfoLogic) UserInfo() (*types.UserInfoResp, error) {
	uid := ctxx.UID(l.ctx)
	if uid == 0 {
		return nil, errors.New("no user in context")
	}
	u, err := model.GetUserByID(l.ctx, l.svcCtx.DB, uid)
	if err != nil {
		return nil, err
	}
	roleIDs, err := model.ListUserRoles(l.ctx, l.svcCtx.DB, uid)
	if err != nil {
		return nil, err
	}
	roles := make([]string, 0, len(roleIDs))
	for _, rid := range roleIDs {
		r, e := model.GetRoleByID(l.ctx, l.svcCtx.DB, rid)
		if e == nil {
			roles = append(roles, r.Code)
		}
	}
	perms, err := l.svcCtx.UserPermissions(l.ctx, uid)
	if err != nil {
		return nil, err
	}
	return &types.UserInfoResp{
		ID:       u.ID,
		Username: u.Username,
		Nickname: u.Nickname,
		Avatar:   u.Avatar,
		Roles:    roles,
		Perms:    perms,
	}, nil
}