package auth

import (
	"context"
	"errors"

	"admin-server/internal/model"
	"admin-server/internal/svc"
	"admin-server/internal/types"
	"admin-server/pkg/ctxx"
	"admin-server/pkg/encrypt"

	"github.com/zeromicro/go-zero/core/logx"
)

type ChangePasswordLogic struct {
	logx.Logger
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewChangePasswordLogic(ctx context.Context, svcCtx *svc.ServiceContext) *ChangePasswordLogic {
	return &ChangePasswordLogic{Logger: logx.WithContext(ctx), ctx: ctx, svcCtx: svcCtx}
}

func (l *ChangePasswordLogic) ChangePassword(req *types.ChangePasswordReq) error {
	if req.NewPassword == "" {
		return errors.New("new password is required")
	}
	uid := ctxx.UID(l.ctx)
	if uid == 0 {
		return errors.New("no user in context")
	}
	u, err := model.GetUserByID(l.ctx, l.svcCtx.DB, uid)
	if err != nil {
		return err
	}
	if !encrypt.CheckPassword(req.OldPassword, u.Password) {
		return errors.New("old password is incorrect")
	}
	hash, err := encrypt.HashPassword(req.NewPassword)
	if err != nil {
		return err
	}
	return model.UpdateUserPassword(l.ctx, l.svcCtx.DB, uid, hash)
}