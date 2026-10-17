package ai

import (
	"context"
	"strings"

	"admin-server/internal/model"
	"admin-server/internal/svc"
	"admin-server/internal/types"
	"admin-server/pkg/response"
)

// UsageLogic serves the AI dashboard: token/call counters, sentiment & risk
// breakdowns, per-channel stats, and the generation history table.
type UsageLogic struct {
	FeedbackLogic
}

func NewUsageLogic(ctx context.Context, svcCtx *svc.ServiceContext) *UsageLogic {
	return &UsageLogic{FeedbackLogic{SentimentLogic{GenerateLogic{BaseLogic: newBase(ctx, svcCtx)}}}}
}

// Usage returns everything the dashboard renders in a single round-trip.
func (l *UsageLogic) Usage(days int) (*types.AiUsageVO, error) {
	if days <= 0 || days > 365 {
		days = 30
	}
	conn := l.svcCtx.DB
	out := &types.AiUsageVO{
		Sentiment: []types.AiSentimentStatVO{},
		Risk:      []types.AiRiskStatVO{},
		Source:    []types.AiSourceStatVO{},
		Task:      []types.AiTaskStatVO{},
		Daily:     []types.AiDailyStatVO{},
	}

	overview, err := model.AiUsageOverview(l.ctx, conn)
	if err != nil {
		return nil, err
	}
	out.TotalCalls = overview.TotalCalls
	out.TodayCalls = overview.TodayCalls
	out.TotalTokens = overview.TotalTokens
	out.MockedCalls = overview.MockedCalls
	out.AvgElapsed = overview.AvgElapsed
	out.FeedbackTotal = overview.FeedbackTotal
	out.FeedbackPending = overview.FeedbackPending
	out.HighRisk = overview.HighRisk

	if rows, err := model.FeedbackSentimentStats(l.ctx, conn); err == nil {
		for _, r := range rows {
			out.Sentiment = append(out.Sentiment, types.AiSentimentStatVO{
				Sentiment: r.Sentiment, Cnt: r.Cnt, AvgScore: r.AvgScore,
			})
		}
	}
	if rows, err := model.FeedbackRiskStats(l.ctx, conn); err == nil {
		for _, r := range rows {
			out.Risk = append(out.Risk, types.AiRiskStatVO{RiskLevel: r.RiskLevel, Cnt: r.Cnt})
		}
	}
	if rows, err := model.FeedbackSourceStats(l.ctx, conn); err == nil {
		for _, r := range rows {
			out.Source = append(out.Source, types.AiSourceStatVO{
				Source: r.Source, Cnt: r.Cnt, Negative: r.Negative, AvgScore: r.AvgScore,
			})
		}
	}
	if rows, err := model.ChatTaskStats(l.ctx, conn); err == nil {
		for _, r := range rows {
			out.Task = append(out.Task, types.AiTaskStatVO{
				Task: r.Task, Cnt: r.Cnt, TotalTokens: r.TotalTokens, AvgElapsed: r.AvgElapsed,
			})
		}
	}
	if rows, err := model.ChatDailyStats(l.ctx, conn, days); err == nil {
		for _, r := range rows {
			out.Daily = append(out.Daily, types.AiDailyStatVO{
				Date: r.Date, Cnt: r.Cnt, TotalTokens: r.TotalTokens, AvgElapsed: r.AvgElapsed,
			})
		}
	}
	return out, nil
}

// Records returns a page of generation history.
func (l *UsageLogic) Records(req *types.AiRecordListReq) (*response.PageData, error) {
	if req.Page <= 0 {
		req.Page = 1
	}
	if req.PerPage <= 0 {
		req.PerPage = 10
	}
	if req.PerPage > 200 {
		req.PerPage = 200
	}
	list, total, err := model.ListChatRecords(l.ctx, l.svcCtx.DB, req.Page, req.PerPage, req.Task)
	if err != nil {
		return nil, err
	}
	vos := make([]*types.AiRecordVO, 0, len(list))
	for _, r := range list {
		vos = append(vos, &types.AiRecordVO{
			ID:               r.ID,
			Task:             r.Task,
			TaskLabel:        taskCN(r.Task),
			Scene:            r.Scene,
			Model:            r.Model,
			Vendor:           r.Vendor,
			PromptTokens:     r.PromptTokens,
			CompletionTokens: r.CompletionTokens,
			TotalTokens:      r.TotalTokens,
			Elapsed:          r.Elapsed,
			Mocked:           r.Mocked,
			Input:            r.Input,
			Output:           r.Output,
			UserID:           r.UserID,
			CreatedAt:        nowISO(r.CreatedAt),
		})
	}
	return &response.PageData{List: vos, Total: total, Page: req.Page, PerPage: req.PerPage}, nil
}

func (l *UsageLogic) DeleteRecord(id int64) error {
	return model.DeleteChatRecord(l.ctx, l.svcCtx.DB, id)
}

func (l *UsageLogic) ClearRecords() error {
	return model.ClearChatRecords(l.ctx, l.svcCtx.DB)
}

// Status exposes the current model wiring (never the API key).
func (l *UsageLogic) Status() map[string]interface{} {
	return l.svcCtx.AIStatus()
}

// taskCN is the display label mapping shared with the front-end.
func taskCN(task string) string {
	switch strings.TrimSpace(task) {
	case types.AiTaskGenerate:
		return "内容生成"
	case types.AiTaskPolish:
		return "润色"
	case types.AiTaskExpand:
		return "扩写"
	case types.AiTaskContinue:
		return "续写"
	case types.AiTaskTrans:
		return "翻译"
	case types.AiTaskSenti:
		return "情感分析"
	default:
		return task
	}
}
