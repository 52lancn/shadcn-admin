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

// GalleryLogic powers the image gallery demo.
type GalleryLogic struct {
	ctx    context.Context
	svcCtx *svc.ServiceContext
	logx.Logger
}

func NewGalleryLogic(ctx context.Context, svcCtx *svc.ServiceContext) *GalleryLogic {
	return &GalleryLogic{
		ctx:    ctx,
		svcCtx: svcCtx,
		Logger: logx.WithContext(ctx),
	}
}

func toGalleryVO(g *model.DemoGallery) *types.DemoGalleryVO {
	if g == nil {
		return nil
	}
	thumb := g.Thumb
	if thumb == "" {
		thumb = g.URL
	}
	return &types.DemoGalleryVO{
		ID:          g.ID,
		Title:       g.Title,
		Category:    g.Category,
		URL:         g.URL,
		Thumb:       thumb,
		Width:       g.Width,
		Height:      g.Height,
		Likes:       g.Likes,
		Description: g.Description,
		Status:      g.Status,
		CreatedAt:   g.CreatedAt.Format("2006-01-02 15:04:05"),
	}
}

func (l *GalleryLogic) List(req *types.GalleryListReq) (*response.PageData, error) {
	if req.Page <= 0 {
		req.Page = 1
	}
	if req.PerPage <= 0 {
		req.PerPage = 12
	}
	if req.PerPage > 200 {
		req.PerPage = 200
	}
	list, total, err := model.ListGalleries(l.ctx, l.svcCtx.DB, req.Page, req.PerPage, req.Keyword, req.Category)
	if err != nil {
		return nil, err
	}
	vos := make([]*types.DemoGalleryVO, 0, len(list))
	for _, g := range list {
		vos = append(vos, toGalleryVO(g))
	}
	return &response.PageData{List: vos, Total: total, Page: req.Page, PerPage: req.PerPage}, nil
}

func (l *GalleryLogic) Get(id int64) (*types.DemoGalleryVO, error) {
	g, err := model.GetGalleryByID(l.ctx, l.svcCtx.DB, id)
	if err != nil {
		return nil, err
	}
	return toGalleryVO(g), nil
}

func (l *GalleryLogic) Create(req *types.DemoGallerySaveReq) error {
	if req.Title == "" {
		return errors.New("title is required")
	}
	if req.URL == "" {
		return errors.New("url is required")
	}
	if req.Category == "" {
		req.Category = "未分类"
	}
	if req.Width <= 0 {
		req.Width = 1200
	}
	if req.Height <= 0 {
		req.Height = 800
	}
	if req.Status == 0 {
		req.Status = 1
	}
	if req.Thumb == "" {
		req.Thumb = req.URL
	}
	g := &model.DemoGallery{
		Title:       req.Title,
		Category:    req.Category,
		URL:         req.URL,
		Thumb:       req.Thumb,
		Width:       req.Width,
		Height:      req.Height,
		Likes:       req.Likes,
		Description: req.Description,
		Status:      req.Status,
	}
	_, err := model.CreateGallery(l.ctx, l.svcCtx.DB, g)
	return err
}

func (l *GalleryLogic) Update(req *types.DemoGallerySaveReq) error {
	if req.ID <= 0 {
		return errors.New("id is required")
	}
	if req.Title == "" {
		return errors.New("title is required")
	}
	if req.URL == "" {
		return errors.New("url is required")
	}
	if req.Thumb == "" {
		req.Thumb = req.URL
	}
	if req.Status == 0 {
		req.Status = 1
	}
	g := &model.DemoGallery{
		ID:          req.ID,
		Title:       req.Title,
		Category:    req.Category,
		URL:         req.URL,
		Thumb:       req.Thumb,
		Width:       req.Width,
		Height:      req.Height,
		Likes:       req.Likes,
		Description: req.Description,
		Status:      req.Status,
	}
	return model.UpdateGallery(l.ctx, l.svcCtx.DB, g)
}

func (l *GalleryLogic) Delete(id int64) error {
	return model.DeleteGallery(l.ctx, l.svcCtx.DB, id)
}

func (l *GalleryLogic) BatchDelete(ids []int64) error {
	if len(ids) == 0 {
		return errors.New("ids is empty")
	}
	return model.BatchDeleteGalleries(l.ctx, l.svcCtx.DB, ids)
}

// Categories returns category facets with counts for the gallery filter bar.
func (l *GalleryLogic) Categories() ([]*model.NameCount, error) {
	return model.GalleryCategories(l.ctx, l.svcCtx.DB)
}
