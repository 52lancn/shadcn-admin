package auth

import (
	"context"
	"errors"
	"time"

	"admin-server/internal/model"
	"admin-server/internal/svc"
	"admin-server/internal/types"
	"admin-server/pkg/encrypt"
	"admin-server/pkg/jwt"

	"github.com/zeromicro/go-zero/core/logx"
)

type LoginLogic struct {
	logx.Logger
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewLoginLogic(ctx context.Context, svcCtx *svc.ServiceContext) *LoginLogic {
	return &LoginLogic{
		Logger: logx.WithContext(ctx),
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

func (l *LoginLogic) Login(req *types.LoginReq) (*types.LoginResp, error) {
	if req.Username == "" || req.Password == "" {
		return nil, errors.New("username and password are required")
	}
	u, err := model.GetUserByUsername(l.ctx, l.svcCtx.DB, req.Username)
	if err != nil {
		if errors.Is(err, model.ErrNotFound) {
			return nil, errors.New("user does not exist")
		}
		return nil, err
	}
	if u.Status != 1 {
		return nil, errors.New("user is disabled")
	}
	if !encrypt.CheckPassword(req.Password, u.Password) {
		return nil, errors.New("incorrect password")
	}
	roleIDs, err := model.ListUserRoles(l.ctx, l.svcCtx.DB, u.ID)
	if err != nil {
		return nil, err
	}
	token, err := jwt.Sign(l.svcCtx.Config.Auth.AccessSecret, l.svcCtx.Config.Auth.AccessExpire, jwt.Claims{
		UserID:   u.ID,
		UserName: u.Username,
		RoleIDs:  roleIDs,
	})
	if err != nil {
		return nil, err
	}
	// invalidate cached perms so the cache rebuilds after role change scenarios
	l.svcCtx.InvalidateUserPerms(u.ID)
	_ = time.Now()
	return &types.LoginResp{Token: token, ExpireIn: l.svcCtx.Config.Auth.AccessExpire}, nil
}