package ai

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"strings"

	"admin-server/internal/model"
	"admin-server/internal/svc"
	"admin-server/internal/types"
	"admin-server/pkg/llm"
)

// SentimentLogic analyses user comments / feedback / community chatter,
// classifies emotion, and raises an alert for hostile complaints.
type SentimentLogic struct {
	GenerateLogic
}

func NewSentimentLogic(ctx context.Context, svcCtx *svc.ServiceContext) *SentimentLogic {
	return &SentimentLogic{GenerateLogic{BaseLogic: newBase(ctx, svcCtx)}}
}

// modelVerdict is the strict JSON contract we ask the model to return.
type modelVerdict struct {
	Sentiment  string   `json:"sentiment"`
	Score      float64  `json:"score"`
	Confidence float64  `json:"confidence"`
	RiskLevel  string   `json:"riskLevel"`
	Tags       []string `json:"tags"`
	Summary    string   `json:"summary"`
	Suggestion string   `json:"suggestion"`
}

const sentimentSystem = `你是一名资深的舆情分析师，负责分析电商评论、客服工单与社交媒体言论。

[task:sentiment]

## RULES
1. 判断整体情绪倾向，取值只能是 positive / negative / neutral 三者之一。
2. score 为 -1 到 1 的连续值：1 极度正向，0 中性，-1 极度负向。
3. confidence 为 0 到 1 的置信度。
4. 判断风险等级 riskLevel，取值只能是 low / medium / high：
   - high：出现「投诉 / 举报 / 起诉 / 曝光 / 315 / 消协 / 维权 / 找媒体」等维权、威胁升级或恶意投诉言论；
   - medium：明显负面且包含具体问题（质量、破损、价格、服务态度等），但无维权升级迹象；
   - low：正向或中性，或仅有轻微不满。
5. tags 给出 1-4 个中文关键词标签，例如「质量问题」「物流慢」「客服态度」「恶意投诉」。
6. summary 用一句话概括该言论的核心内容与情绪。
7. suggestion 给出具体可执行的处置建议，high 风险需明确写出响应时限。

## OUTPUT
只输出一个 JSON 对象，不要输出任何其他文字、不要用代码块包裹，字段严格如下：
{"sentiment":"positive|negative|neutral","score":0.0,"confidence":0.0,"riskLevel":"low|medium|high","tags":["标签"],"summary":"一句话概括","suggestion":"处置建议"}`

// Analyze classifies a single piece of text. When feedbackId > 0 the verdict
// is written back onto the stored row.
func (l *SentimentLogic) Analyze(req *types.AiSentimentAnalyzeReq) (*types.AiSentimentResp, error) {
	content := strings.TrimSpace(req.Content)
	var feedbackID int64

	if req.FeedbackID > 0 {
		fb, err := model.GetFeedbackByID(l.ctx, l.svcCtx.DB, req.FeedbackID)
		if err != nil {
			return nil, err
		}
		content = fb.Content
		feedbackID = fb.ID
	}
	if content == "" {
		return nil, errors.New("content is required")
	}
	if len([]rune(content)) > 4000 {
		content = string([]rune(content)[:4000])
	}

	resp, err := l.chat(req.Model, []llm.Message{
		{Role: "system", Content: sentimentSystem},
		{Role: "user", Content: buildSentimentUserMsg(content)},
	})
	if err != nil {
		return nil, err
	}

	verdict := parseVerdict(resp.Content)
	out := &types.AiSentimentResp{
		Sentiment:  verdict.Sentiment,
		Score:      verdict.Score,
		Confidence: verdict.Confidence,
		RiskLevel:  verdict.RiskLevel,
		Tags:       verdict.Tags,
		Summary:    verdict.Summary,
		Suggestion: verdict.Suggestion,
		Alert:      verdict.RiskLevel == "high",
		Mocked:     resp.Mocked,
		Model:      resp.Model,
		Vendor:     resp.Vendor,
		Elapsed:    resp.Elapsed,
		FeedbackID: feedbackID,
	}

	if req.Persist && feedbackID > 0 {
		if err := l.persistVerdict(feedbackID, verdict); err != nil {
			l.Errorf("ai: persist sentiment verdict failed: %v", err)
		}
	}

	l.record(&model.AiChatRecord{
		Task:             types.AiTaskSenti,
		Scene:            "feedback",
		Model:            resp.Model,
		Vendor:           resp.Vendor,
		PromptTokens:     resp.Usage.PromptTokens,
		CompletionTokens: resp.Usage.CompletionTokens,
		TotalTokens:      resp.Usage.TotalTokens,
		Elapsed:          int(resp.Elapsed),
		Mocked:           boolToInt(resp.Mocked),
		Input:            content,
		Output:           fmt.Sprintf("%s / %s / score=%.2f", verdict.Sentiment, verdict.RiskLevel, verdict.Score),
		UserID:           l.uid(),
	})

	return out, nil
}

func (l *SentimentLogic) persistVerdict(id int64, v modelVerdict) error {
	return model.UpdateFeedbackAnalysis(l.ctx, l.svcCtx.DB, &model.AiFeedback{
		ID:         id,
		Sentiment:  v.Sentiment,
		Score:      v.Score,
		Confidence: v.Confidence,
		RiskLevel:  v.RiskLevel,
		Tags:       strings.Join(v.Tags, ","),
		Summary:    v.Summary,
		Suggestion: v.Suggestion,
	})
}

// BulkAnalyze runs sentiment over every not-yet-analyzed feedback row.
// Failures on individual rows are counted, not fatal, so one bad row cannot
// abort the whole batch.
func (l *SentimentLogic) BulkAnalyze(limit int) (*types.AiBulkAnalyzeResp, error) {
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	ids, err := model.UnanalyzedFeedbackIDs(l.ctx, l.svcCtx.DB, limit)
	if err != nil {
		return nil, err
	}
	out := &types.AiBulkAnalyzeResp{Total: int64(len(ids)), Results: make([]types.AiSentimentResp, 0, len(ids))}

	for _, id := range ids {
		resp, err := l.Analyze(&types.AiSentimentAnalyzeReq{FeedbackID: id, Persist: true})
		if err != nil {
			l.Errorf("ai: bulk analyze feedback %d failed: %v", id, err)
			out.Failed++
			continue
		}
		out.Succeed++
		out.Results = append(out.Results, *resp)
		if resp.Mocked {
			out.Mocked = true
		}
		switch resp.Sentiment {
		case "negative":
			out.Negative++
		case "positive":
			out.Positive++
		default:
			out.Neutral++
		}
		if resp.Alert {
			out.Alerts++
		}
	}
	return out, nil
}

// parseVerdict extracts the JSON object from a model response. Real models
// occasionally wrap JSON in prose or code fences, so this is deliberately
// forgiving; anything unparseable falls back to the local keyword engine so
// the UI never shows a blank verdict.
func parseVerdict(raw string) modelVerdict {
	var v modelVerdict
	if obj := extractJSONObject(raw); obj != "" {
		if err := json.Unmarshal([]byte(obj), &v); err == nil {
			v.normalize()
			return v
		}
	}
	// Fallback: local keyword engine on the raw text.
	if local, err := llm.LocalChat(llm.Request{
		Messages: []llm.Message{
			{Role: "system", Content: "[task:sentiment]"},
			{Role: "user", Content: raw},
		},
	}); err == nil {
		var lv llm.LocalSentimentResult
		if json.Unmarshal([]byte(local.Content), &lv) == nil {
			v = modelVerdict{
				Sentiment:  lv.Sentiment,
				Score:      lv.Score,
				Confidence: lv.Confidence,
				RiskLevel:  lv.RiskLevel,
				Tags:       lv.Tags,
				Summary:    lv.Summary,
				Suggestion: lv.Suggestion,
			}
			v.normalize()
			return v
		}
	}
	v.normalize()
	return v
}

// extractJSONObject pulls the outermost balanced {...} block out of a model
// response. It tolerates prose before/after the JSON and nested objects,
// which greedy regex matching does not.
func extractJSONObject(s string) string {
	start := strings.Index(s, "{")
	if start < 0 {
		return ""
	}
	depth := 0
	inString := false
	escaped := false
	for i := start; i < len(s); i++ {
		c := s[i]
		if inString {
			switch {
			case escaped:
				escaped = false
			case c == '\\':
				escaped = true
			case c == '"':
				inString = false
			}
			continue
		}
		switch c {
		case '"':
			inString = true
		case '{':
			depth++
		case '}':
			depth--
			if depth == 0 {
				return s[start : i+1]
			}
		}
	}
	return ""
}

// normalize coerces every field into its valid range so a sloppy model can
// never poison the dashboard with out-of-domain values.
func (v *modelVerdict) normalize() {
	switch v.Sentiment {
	case "positive", "negative", "neutral":
	default:
		v.Sentiment = "neutral"
	}
	switch v.RiskLevel {
	case "low", "medium", "high":
	default:
		v.RiskLevel = "low"
	}
	if math.IsNaN(v.Score) || math.IsInf(v.Score, 0) {
		v.Score = 0
	}
	v.Score = clampFloat(v.Score, -1, 1)
	if math.IsNaN(v.Confidence) || math.IsInf(v.Confidence, 0) {
		v.Confidence = 0.5
	}
	v.Confidence = clampFloat(v.Confidence, 0, 1)
	// Keep only short, non-empty tags.
	clean := make([]string, 0, len(v.Tags))
	for _, t := range v.Tags {
		t = strings.TrimSpace(t)
		if t == "" || len([]rune(t)) > 20 {
			continue
		}
		clean = append(clean, t)
		if len(clean) == 4 {
			break
		}
	}
	v.Tags = clean
	if len(v.Tags) == 0 {
		v.Tags = []string{"未分类"}
	}
	if len([]rune(v.Summary)) > 500 {
		v.Summary = string([]rune(v.Summary)[:500])
	}
	if len([]rune(v.Suggestion)) > 500 {
		v.Suggestion = string([]rune(v.Suggestion)[:500])
	}
	if v.Summary == "" {
		v.Summary = "模型未返回摘要"
	}
	if v.Suggestion == "" {
		v.Suggestion = suggestionFallback(v.RiskLevel)
	}
	// Cross-field consistency: a "high" risk row must never read as positive.
	if v.RiskLevel == "high" && v.Sentiment != "negative" {
		v.Sentiment = "negative"
		if v.Score > 0 {
			v.Score = -0.5
		}
	}
}

func suggestionFallback(risk string) string {
	switch risk {
	case "high":
		return "疑似恶意投诉或维权言论，建议立即人工介入并保留证据。"
	case "medium":
		return "负向反馈，建议客服主动联系用户核实问题。"
	default:
		return "可归档，无需即时处理。"
	}
}

func clampFloat(v, lo, hi float64) float64 {
	if v < lo {
		return lo
	}
	if v > hi {
		return hi
	}
	return v
}

func buildSentimentUserMsg(content string) string {
	return "请分析以下用户言论的情绪倾向与风险等级：\n\n---\n" + content + "\n---"
}
