package demo

import (
	"context"
	"errors"

	"admin-server/internal/model"
	"admin-server/internal/svc"
	"admin-server/internal/types"
	"admin-server/pkg/response"

	"github.com/zeromicro/go-zero/core/logx"
)

// ProductLogic powers the "data list" demo: paging + sorting + filtering + batch delete.
type ProductLogic struct {
	ctx    context.Context
	svcCtx *svc.ServiceContext
	logx.Logger
}

func NewProductLogic(ctx context.Context, svcCtx *svc.ServiceContext) *ProductLogic {
	return &ProductLogic{
		ctx:    ctx,
		svcCtx: svcCtx,
		Logger: logx.WithContext(ctx),
	}
}

func toProductVO(p *model.DemoProduct) *types.DemoProductVO {
	if p == nil {
		return nil
	}
	return &types.DemoProductVO{
		ID:        p.ID,
		Name:      p.Name,
		SKU:       p.SKU,
		Category:  p.Category,
		Brand:     p.Brand,
		Price:     p.Price,
		Stock:     p.Stock,
		Sales:     p.Sales,
		Rating:    p.Rating,
		Status:    p.Status,
		Cover:     p.Cover,
		Tags:      p.Tags,
		CreatedAt: p.CreatedAt.Format("2006-01-02 15:04:05"),
	}
}

func (l *ProductLogic) List(req *types.ProductListReq) (*response.PageData, error) {
	if req.Page <= 0 {
		req.Page = 1
	}
	if req.PerPage <= 0 {
		req.PerPage = 10
	}
	if req.PerPage > 200 {
		req.PerPage = 200
	}
	if req.Order != "" && req.Order != "asc" && req.Order != "desc" {
		return nil, errors.New("order must be asc or desc")
	}
	list, total, err := model.ListProducts(l.ctx, l.svcCtx.DB, req.Page, req.PerPage, req.Keyword, req.Category, req.Status, req.SortBy, req.Order)
	if err != nil {
		return nil, err
	}
	vos := make([]*types.DemoProductVO, 0, len(list))
	for _, p := range list {
		vos = append(vos, toProductVO(p))
	}
	return &response.PageData{List: vos, Total: total, Page: req.Page, PerPage: req.PerPage}, nil
}

func (l *ProductLogic) Get(id int64) (*types.DemoProductVO, error) {
	p, err := model.GetProductByID(l.ctx, l.svcCtx.DB, id)
	if err != nil {
		return nil, err
	}
	return toProductVO(p), nil
}

func (l *ProductLogic) Create(req *types.DemoProductSaveReq) error {
	if req.Name == "" {
		return errors.New("name is required")
	}
	if req.SKU == "" {
		return errors.New("sku is required")
	}
	if req.Price < 0 || req.Stock < 0 || req.Sales < 0 {
		return errors.New("negative numeric value is not allowed")
	}
	if req.Rating <= 0 {
		req.Rating = 4.5
	}
	if req.Rating > 5 {
		req.Rating = 5
	}
	p := &model.DemoProduct{
		Name:     req.Name,
		SKU:      req.SKU,
		Category: req.Category,
		Brand:    req.Brand,
		Price:    req.Price,
		Stock:    req.Stock,
		Sales:    req.Sales,
		Rating:   req.Rating,
		Status:   req.Status,
		Cover:    req.Cover,
		Tags:     req.Tags,
	}
	if p.Status == 0 && req.Status == 0 {
		// keep explicit 0 (off-shelf) as-is
	} else if p.Status != 1 {
		p.Status = 1
	}
	_, err := model.CreateProduct(l.ctx, l.svcCtx.DB, p)
	return err
}

func (l *ProductLogic) Update(req *types.DemoProductSaveReq) error {
	if req.ID <= 0 {
		return errors.New("id is required")
	}
	if req.Name == "" {
		return errors.New("name is required")
	}
	if req.Rating <= 0 {
		req.Rating = 4.5
	}
	if req.Rating > 5 {
		req.Rating = 5
	}
	p := &model.DemoProduct{
		ID:       req.ID,
		Name:     req.Name,
		SKU:      req.SKU,
		Category: req.Category,
		Brand:    req.Brand,
		Price:    req.Price,
		Stock:    req.Stock,
		Sales:    req.Sales,
		Rating:   req.Rating,
		Status:   req.Status,
		Cover:    req.Cover,
		Tags:     req.Tags,
	}
	return model.UpdateProduct(l.ctx, l.svcCtx.DB, p)
}

func (l *ProductLogic) Delete(id int64) error {
	return model.DeleteProduct(l.ctx, l.svcCtx.DB, id)
}

func (l *ProductLogic) BatchDelete(ids []int64) error {
	if len(ids) == 0 {
		return errors.New("ids is empty")
	}
	return model.BatchDeleteProducts(l.ctx, l.svcCtx.DB, ids)
}

// Stats returns per-category aggregates plus the available category filter list.
func (l *ProductLogic) Stats() (map[string]interface{}, error) {
	rows, err := model.ProductStats(l.ctx, l.svcCtx.DB)
	if err != nil {
		return nil, err
	}
	cats, err := model.ProductCategories(l.ctx, l.svcCtx.DB)
	if err != nil {
		cats = nil
	}
	var totalCnt, totalStock, totalSales int64
	for _, r := range rows {
		totalCnt += r.Cnt
		totalStock += r.Stock
		totalSales += r.Sales
	}
	return map[string]interface{}{
		"total":      totalCnt,
		"totalStock": totalStock,
		"totalSales": totalSales,
		"byCategory": rows,
		"categories": cats,
	}, nil
}
