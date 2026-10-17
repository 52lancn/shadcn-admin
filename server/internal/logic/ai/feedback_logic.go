package ai

import (
	"context"
	"errors"
	"strconv"
	"strings"

	"admin-server/internal/model"
	"admin-server/internal/svc"
	"admin-server/internal/types"
	"admin-server/pkg/response"
)

// FeedbackLogic manages the sentiment console's data source: the comments /
// tickets that get analyzed.
type FeedbackLogic struct {
	SentimentLogic
}

func NewFeedbackLogic(ctx context.Context, svcCtx *svc.ServiceContext) *FeedbackLogic {
	return &FeedbackLogic{SentimentLogic{GenerateLogic{BaseLogic: newBase(ctx, svcCtx)}}}
}

func toFeedbackVO(f *model.AiFeedback) *types.AiFeedbackVO {
	if f == nil {
		return nil
	}
	v := &types.AiFeedbackVO{
		ID:         f.ID,
		Content:    f.Content,
		Source:     f.Source,
		Author:     f.Author,
		Rating:     f.Rating,
		Product:    f.Product,
		Sentiment:  f.Sentiment,
		Score:      f.Score,
		Confidence: f.Confidence,
		RiskLevel:  f.RiskLevel,
		Tags:       f.Tags,
		Summary:    f.Summary,
		Suggestion: f.Suggestion,
		Handled:    f.Handled,
		CreatedAt:  nowISO(f.CreatedAt),
	}
	if f.AnalyzedAt.Valid {
		v.AnalyzedAt = nowISO(f.AnalyzedAt.Time)
	}
	return v
}

func (l *FeedbackLogic) List(req *types.AiFeedbackListReq) (*response.PageData, error) {
	if req.Page <= 0 {
		req.Page = 1
	}
	if req.PerPage <= 0 {
		req.PerPage = 10
	}
	if req.PerPage > 200 {
		req.PerPage = 200
	}

	var handled *int
	if req.Handled != "" {
		if v, err := strconv.Atoi(req.Handled); err == nil {
			handled = &v
		}
	}

	list, total, err := model.ListFeedback(l.ctx, l.svcCtx.DB, req.Page, req.PerPage, model.FeedbackFilter{
		Sentiment: req.Sentiment,
		RiskLevel: req.RiskLevel,
		Source:    req.Source,
		Keyword:   req.Keyword,
		Handled:   handled,
	})
	if err != nil {
		return nil, err
	}
	vos := make([]*types.AiFeedbackVO, 0, len(list))
	for _, f := range list {
		vos = append(vos, toFeedbackVO(f))
	}
	return &response.PageData{List: vos, Total: total, Page: req.Page, PerPage: req.PerPage}, nil
}

func (l *FeedbackLogic) Create(req *types.AiFeedbackCreateReq) (*types.AiFeedbackVO, error) {
	content := strings.TrimSpace(req.Content)
	if content == "" {
		return nil, errors.New("content is required")
	}
	source := strings.TrimSpace(req.Source)
	if source == "" {
		source = "手动录入"
	}
	rating := req.Rating
	if rating < 1 || rating > 5 {
		rating = 5
	}

	f := &model.AiFeedback{
		Content: content,
		Source:  source,
		Author:  strings.TrimSpace(req.Author),
		Rating:  rating,
		Product: strings.TrimSpace(req.Product),
	}
	id, err := model.CreateFeedback(l.ctx, l.svcCtx.DB, f)
	if err != nil {
		return nil, err
	}

	// Optional inline analysis so a freshly pasted comment is immediately
	// classified in the console.
	if req.AutoAnalyze {
		if _, aerr := l.Analyze(&types.AiSentimentAnalyzeReq{FeedbackID: id, Persist: true}); aerr != nil {
			l.Errorf("ai: auto-analyze new feedback %d failed: %v", id, aerr)
		}
	}

	created, err := model.GetFeedbackByID(l.ctx, l.svcCtx.DB, id)
	if err != nil {
		return nil, err
	}
	return toFeedbackVO(created), nil
}

func (l *FeedbackLogic) UpdateHandled(id int64, handled int) error {
	if handled != 0 && handled != 1 {
		return errors.New("handled must be 0 or 1")
	}
	return model.UpdateFeedbackHandled(l.ctx, l.svcCtx.DB, id, handled)
}

func (l *FeedbackLogic) Delete(id int64) error {
	return model.DeleteFeedback(l.ctx, l.svcCtx.DB, id)
}

// Alerts returns the unhandled high-risk rows - the console's real-time
// warning feed.
func (l *FeedbackLogic) Alerts(limit int) ([]*types.AiFeedbackVO, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	zero := 0
	list, _, err := model.ListFeedback(l.ctx, l.svcCtx.DB, 1, limit, model.FeedbackFilter{
		RiskLevel: "high",
		Handled:   &zero,
	})
	if err != nil {
		return nil, err
	}
	out := make([]*types.AiFeedbackVO, 0, len(list))
	for _, f := range list {
		out = append(out, toFeedbackVO(f))
	}
	return out, nil
}

// Sources lists the distinct feedback channels for the filter bar.
func (l *FeedbackLogic) Sources() ([]string, error) {
	list, err := model.FeedbackSourceStats(l.ctx, l.svcCtx.DB)
	if err != nil {
		return nil, err
	}
	out := make([]string, 0, len(list))
	for _, s := range list {
		out = append(out, s.Source)
	}
	return out, nil
}
