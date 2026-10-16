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

type DictLogic struct {
	logx.Logger
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewDictLogic(ctx context.Context, svcCtx *svc.ServiceContext) *DictLogic {
	return &DictLogic{Logger: logx.WithContext(ctx), ctx: ctx, svcCtx: svcCtx}
}

// ---- dicts ----

func (l *DictLogic) List(req *types.PageReq) (*response.PageData, error) {
	if req.Page <= 0 {
		req.Page = 1
	}
	if req.PerPage <= 0 || req.PerPage > 200 {
		req.PerPage = 10
	}
	dicts, total, err := model.ListDicts(l.ctx, l.svcCtx.DB, req.Page, req.PerPage, req.Keyword, req.Status)
	if err != nil {
		return nil, err
	}
	out := make([]*types.DictVO, 0, len(dicts))
	for _, d := range dicts {
		out = append(out, &types.DictVO{
			ID:        d.ID,
			Name:      d.Name,
			Code:      d.Code,
			Status:    d.Status,
			Remark:    d.Remark,
			CreatedAt: formatTime(d.CreatedAt),
		})
	}
	return &response.PageData{List: out, Total: total, Page: req.Page, PerPage: req.PerPage}, nil
}

func (l *DictLogic) Create(req *types.DictSaveReq) error {
	if req.Code == "" || req.Name == "" {
		return errors.New("code and name are required")
	}
	d := &model.Dict{Name: req.Name, Code: req.Code, Status: orDefault(req.Status, 1), Remark: req.Remark}
	_, err := model.CreateDict(l.ctx, l.svcCtx.DB, d)
	return err
}

func (l *DictLogic) Update(req *types.DictSaveReq) error {
	if req.ID == 0 {
		return errors.New("id is required")
	}
	d := &model.Dict{ID: req.ID, Name: req.Name, Code: req.Code, Status: orDefault(req.Status, 1), Remark: req.Remark}
	return model.UpdateDict(l.ctx, l.svcCtx.DB, d)
}

func (l *DictLogic) Delete(id int64) error {
	return model.DeleteDict(l.ctx, l.svcCtx.DB, id)
}

// ---- dict items ----

func (l *DictLogic) ListItems(dictID int64) ([]*types.DictItemVO, error) {
	items, err := model.ListDictItems(l.ctx, l.svcCtx.DB, dictID)
	if err != nil {
		return nil, err
	}
	out := make([]*types.DictItemVO, 0, len(items))
	for _, it := range items {
		out = append(out, &types.DictItemVO{ID: it.ID, DictID: it.DictID, Label: it.Label, Value: it.Value, Sort: it.Sort, Status: it.Status})
	}
	return out, nil
}

func (l *DictLogic) CreateItem(req *types.DictItemSaveReq) error {
	if req.DictID == 0 {
		return errors.New("dictId is required")
	}
	it := &model.DictItem{DictID: req.DictID, Label: req.Label, Value: req.Value, Sort: req.Sort, Status: orDefault(req.Status, 1)}
	_, err := model.CreateDictItem(l.ctx, l.svcCtx.DB, it)
	return err
}

func (l *DictLogic) UpdateItem(req *types.DictItemSaveReq) error {
	if req.ID == 0 || req.DictID == 0 {
		return errors.New("id and dictId are required")
	}
	it := &model.DictItem{ID: req.ID, DictID: req.DictID, Label: req.Label, Value: req.Value, Sort: req.Sort, Status: orDefault(req.Status, 1)}
	return model.UpdateDictItem(l.ctx, l.svcCtx.DB, it)
}

func (l *DictLogic) DeleteItem(id int64) error {
	return model.DeleteDictItem(l.ctx, l.svcCtx.DB, id)
}