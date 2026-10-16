package sys

import (
	"context"
	"errors"
	"strings"
	"time"

	"admin-server/internal/model"
	"admin-server/internal/svc"
	"admin-server/internal/types"
	"admin-server/pkg/encrypt"
	"admin-server/pkg/response"

	"github.com/zeromicro/go-zero/core/logx"
)

type UserLogic struct {
	logx.Logger
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewUserLogic(ctx context.Context, svcCtx *svc.ServiceContext) *UserLogic {
	return &UserLogic{Logger: logx.WithContext(ctx), ctx: ctx, svcCtx: svcCtx}
}

func (l *UserLogic) List(req *types.PageReq) (*response.PageData, error) {
	if req.Page <= 0 {
		req.Page = 1
	}
	if req.PerPage <= 0 || req.PerPage > 200 {
		req.PerPage = 10
	}
	users, total, err := model.ListUsers(l.ctx, l.svcCtx.DB, req.Page, req.PerPage, req.Keyword, req.Status)
	if err != nil {
		return nil, err
	}
	out := make([]*types.UserVO, 0, len(users))
	for _, u := range users {
		roleIDs, _ := model.ListUserRoles(l.ctx, l.svcCtx.DB, u.ID)
		out = append(out, &types.UserVO{
			ID:        u.ID,
			Username:  u.Username,
			Nickname:  u.Nickname,
			Email:     u.Email,
			Phone:     u.Phone,
			Avatar:    u.Avatar,
			Gender:    u.Gender,
			Status:    u.Status,
			Remark:    u.Remark,
			RoleIDs:   roleIDs,
			CreatedAt: formatTime(u.CreatedAt),
		})
	}
	return &response.PageData{List: out, Total: total, Page: req.Page, PerPage: req.PerPage}, nil
}

func (l *UserLogic) Get(id int64) (*types.UserVO, error) {
	u, err := model.GetUserByID(l.ctx, l.svcCtx.DB, id)
	if err != nil {
		return nil, err
	}
	roleIDs, _ := model.ListUserRoles(l.ctx, l.svcCtx.DB, u.ID)
	return &types.UserVO{
		ID:        u.ID,
		Username:  u.Username,
		Nickname:  u.Nickname,
		Email:     u.Email,
		Phone:     u.Phone,
		Avatar:    u.Avatar,
		Gender:    u.Gender,
		Status:    u.Status,
		Remark:    u.Remark,
		RoleIDs:   roleIDs,
		CreatedAt: formatTime(u.CreatedAt),
	}, nil
}

func (l *UserLogic) Create(req *types.UserSaveReq) error {
	if strings.TrimSpace(req.Username) == "" {
		return errors.New("username is required")
	}
	if req.Password == "" {
		return errors.New("password is required")
	}
	// username uniqueness check
	if _, err := model.GetUserByUsername(l.ctx, l.svcCtx.DB, req.Username); err == nil {
		return errors.New("username already exists")
	}
	hash, err := encrypt.HashPassword(req.Password)
	if err != nil {
		return err
	}
	u := &model.User{
		Username: req.Username,
		Password: hash,
		Nickname:  req.Nickname,
		Email:     req.Email,
		Phone:     req.Phone,
		Avatar:    req.Avatar,
		Gender:    req.Gender,
		Status:    orDefault(req.Status, 1),
		Remark:    req.Remark,
	}
	uid, err := model.CreateUser(l.ctx, l.svcCtx.DB, u)
	if err != nil {
		return err
	}
	// assign roles
	if len(req.RoleIDs) > 0 {
		if err := model.ReplaceUserRoles(l.ctx, l.svcCtx.DB, uid, req.RoleIDs); err != nil {
			return err
		}
	}
	l.svcCtx.InvalidateUserPerms(uid)
	return nil
}

func (l *UserLogic) Update(req *types.UserSaveReq) error {
	if req.ID == 0 {
		return errors.New("id is required")
	}
	u, err := model.GetUserByID(l.ctx, l.svcCtx.DB, req.ID)
	if err != nil {
		return err
	}
	u.Username = req.Username
	u.Nickname = req.Nickname
	u.Email = req.Email
	u.Phone = req.Phone
	u.Avatar = req.Avatar
	u.Gender = req.Gender
	u.Status = orDefault(req.Status, u.Status)
	u.Remark = req.Remark
	// if password is non-empty, re-hash; otherwise keep existing hash.
	if req.Password != "" {
		hash, err := encrypt.HashPassword(req.Password)
		if err != nil {
			return err
		}
		u.Password = hash
	}
	if err := model.UpdateUser(l.ctx, l.svcCtx.DB, u); err != nil {
		return err
	}
	if err := model.ReplaceUserRoles(l.ctx, l.svcCtx.DB, u.ID, req.RoleIDs); err != nil {
		return err
	}
	l.svcCtx.InvalidateUserPerms(u.ID)
	return nil
}

func (l *UserLogic) Delete(id int64) error {
	if err := model.DeleteUser(l.ctx, l.svcCtx.DB, id); err != nil {
		return err
	}
	l.svcCtx.InvalidateUserPerms(id)
	return nil
}

func (l *UserLogic) BatchDelete(ids []int64) error {
	if err := model.BatchDeleteUsers(l.ctx, l.svcCtx.DB, ids); err != nil {
		return err
	}
	for _, id := range ids {
		l.svcCtx.InvalidateUserPerms(id)
	}
	return nil
}

// ---- helpers ----

func orDefault(v, def int) int {
	if v == 0 {
		return def
	}
	return v
}

func formatTime(t time.Time) string {
	if t.IsZero() {
		return ""
	}
	return t.In(time.Local).Format("2006-01-02 15:04:05")
}