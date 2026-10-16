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

type ConfigLogic struct {
	logx.Logger
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewConfigLogic(ctx context.Context, svcCtx *svc.ServiceContext) *ConfigLogic {
	return &ConfigLogic{Logger: logx.WithContext(ctx), ctx: ctx, svcCtx: svcCtx}
}

func (l *ConfigLogic) List(req *types.PageReq) (*response.PageData, error) {
	if req.Page <= 0 {
		req.Page = 1
	}
	if req.PerPage <= 0 || req.PerPage > 200 {
		req.PerPage = 10
	}
	cfgs, total, err := model.ListConfigs(l.ctx, l.svcCtx.DB, req.Page, req.PerPage, req.Keyword, req.Status)
	if err != nil {
		return nil, err
	}
	out := make([]*types.ConfigVO, 0, len(cfgs))
	for _, c := range cfgs {
		out = append(out, &types.ConfigVO{
			ID:        c.ID,
			Name:      c.Name,
			Key:       c.Key,
			Value:     c.Value,
			Remark:    c.Remark,
			Status:    c.Status,
			CreatedAt: formatTime(c.CreatedAt),
		})
	}
	return &response.PageData{List: out, Total: total, Page: req.Page, PerPage: req.PerPage}, nil
}

func (l *ConfigLogic) Get(key string) (*types.ConfigVO, error) {
	c, err := model.GetConfigByKey(l.ctx, l.svcCtx.DB, key)
	if err != nil {
		return nil, err
	}
	return &types.ConfigVO{
		ID:     c.ID,
		Name:   c.Name,
		Key:    c.Key,
		Value:  c.Value,
		Remark: c.Remark,
		Status: c.Status,
		CreatedAt: formatTime(c.CreatedAt),
	}, nil
}

func (l *ConfigLogic) Create(req *types.ConfigSaveReq) error {
	if req.Key == "" || req.Name == "" {
		return errors.New("key and name are required")
	}
	c := &model.Config{Name: req.Name, Key: req.Key, Value: req.Value, Remark: req.Remark, Status: orDefault(req.Status, 1)}
	_, err := model.CreateConfig(l.ctx, l.svcCtx.DB, c)
	return err
}

func (l *ConfigLogic) Update(req *types.ConfigSaveReq) error {
	if req.ID == 0 {
		return errors.New("id is required")
	}
	c := &model.Config{ID: req.ID, Name: req.Name, Key: req.Key, Value: req.Value, Remark: req.Remark, Status: orDefault(req.Status, 1)}
	return model.UpdateConfig(l.ctx, l.svcCtx.DB, c)
}

func (l *ConfigLogic) Delete(id int64) error {
	return model.DeleteConfig(l.ctx, l.svcCtx.DB, id)
}