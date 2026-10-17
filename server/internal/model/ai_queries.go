package model

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/zeromicro/go-zero/core/stores/sqlx"
)

// ============================ ai_chat_record ============================

func CreateChatRecord(ctx context.Context, conn sqlx.SqlConn, r *AiChatRecord) (int64, error) {
	res, err := execCtx(ctx, conn,
		`INSERT INTO ai_chat_record
		 (task, scene, model, vendor, prompt_tokens, completion_tokens, total_tokens,
		  elapsed, mocked, input, output, user_id)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		r.Task, r.Scene, r.Model, r.Vendor, r.PromptTokens, r.CompletionTokens, r.TotalTokens,
		r.Elapsed, r.Mocked, r.Input, r.Output, r.UserID)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

// ListChatRecords returns a page of generation history, optionally filtered by task.
func ListChatRecords(ctx context.Context, conn sqlx.SqlConn, page, perPage int, task string) ([]*AiChatRecord, int64, error) {
	where := []string{"1=1"}
	args := []interface{}{}
	if task != "" && task != "all" {
		where = append(where, "task = ?")
		args = append(args, task)
	}
	whereSQL := strings.Join(where, " AND ")

	var total int64
	if err := conn.QueryRowCtx(ctx, &total, "SELECT COUNT(*) FROM ai_chat_record WHERE "+whereSQL, args...); err != nil {
		return nil, 0, err
	}

	paged := append(append([]interface{}{}, args...), (page-1)*perPage, perPage)
	q := fmt.Sprintf(`SELECT id, task, scene, model, vendor, prompt_tokens, completion_tokens,
	   total_tokens, elapsed, mocked, input, output, user_id, created_at
	   FROM ai_chat_record WHERE %s ORDER BY id DESC LIMIT ?, ?`, whereSQL)
	var list []*AiChatRecord
	if err := conn.QueryRowsCtx(ctx, &list, q, paged...); err != nil {
		return nil, 0, err
	}
	return list, total, nil
}

func DeleteChatRecord(ctx context.Context, conn sqlx.SqlConn, id int64) error {
	_, err := execCtx(ctx, conn, "DELETE FROM ai_chat_record WHERE id = ?", id)
	return err
}

func ClearChatRecords(ctx context.Context, conn sqlx.SqlConn) error {
	_, err := execCtx(ctx, conn, "DELETE FROM ai_chat_record")
	return err
}

// ============================ ai_feedback ============================

// FeedbackFilter narrows the feedback list query.
type FeedbackFilter struct {
	Sentiment string
	RiskLevel string
	Source    string
	Keyword   string
	Handled   *int // nil = no filter
}

func ListFeedback(ctx context.Context, conn sqlx.SqlConn, page, perPage int, f FeedbackFilter) ([]*AiFeedback, int64, error) {
	where := []string{"1=1"}
	args := []interface{}{}
	if f.Sentiment != "" && f.Sentiment != "all" {
		where = append(where, "sentiment = ?")
		args = append(args, f.Sentiment)
	}
	if f.RiskLevel != "" && f.RiskLevel != "all" {
		where = append(where, "risk_level = ?")
		args = append(args, f.RiskLevel)
	}
	if f.Source != "" && f.Source != "all" {
		where = append(where, "source = ?")
		args = append(args, f.Source)
	}
	if f.Keyword != "" {
		where = append(where, "(content LIKE ? OR author LIKE ? OR product LIKE ?)")
		k := "%" + f.Keyword + "%"
		args = append(args, k, k, k)
	}
	if f.Handled != nil {
		where = append(where, "handled = ?")
		args = append(args, *f.Handled)
	}
	whereSQL := strings.Join(where, " AND ")

	var total int64
	if err := conn.QueryRowCtx(ctx, &total, "SELECT COUNT(*) FROM ai_feedback WHERE "+whereSQL, args...); err != nil {
		return nil, 0, err
	}

	paged := append(append([]interface{}{}, args...), (page-1)*perPage, perPage)
	q := fmt.Sprintf(`SELECT id, content, source, author, rating, product, sentiment, score,
	   confidence, risk_level, tags, summary, suggestion, handled, created_at, analyzed_at
	   FROM ai_feedback WHERE %s ORDER BY id DESC LIMIT ?, ?`, whereSQL)
	var list []*AiFeedback
	if err := conn.QueryRowsCtx(ctx, &list, q, paged...); err != nil {
		return nil, 0, err
	}
	return list, total, nil
}

func GetFeedbackByID(ctx context.Context, conn sqlx.SqlConn, id int64) (*AiFeedback, error) {
	var f AiFeedback
	q := `SELECT id, content, source, author, rating, product, sentiment, score,
	   confidence, risk_level, tags, summary, suggestion, handled, created_at, analyzed_at
	   FROM ai_feedback WHERE id = ?`
	if err := conn.QueryRowCtx(ctx, &f, q, id); err != nil {
		return nil, err
	}
	return &f, nil
}

func CreateFeedback(ctx context.Context, conn sqlx.SqlConn, f *AiFeedback) (int64, error) {
	res, err := execCtx(ctx, conn,
		`INSERT INTO ai_feedback (content, source, author, rating, product)
		 VALUES (?, ?, ?, ?, ?)`,
		f.Content, f.Source, f.Author, f.Rating, f.Product)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

// UpdateFeedbackAnalysis writes the model's verdict back onto a feedback row.
func UpdateFeedbackAnalysis(ctx context.Context, conn sqlx.SqlConn, f *AiFeedback) error {
	_, err := execCtx(ctx, conn,
		`UPDATE ai_feedback
		 SET sentiment = ?, score = ?, confidence = ?, risk_level = ?, tags = ?,
		     summary = ?, suggestion = ?, analyzed_at = ?
		 WHERE id = ?`,
		f.Sentiment, f.Score, f.Confidence, f.RiskLevel, f.Tags,
		f.Summary, f.Suggestion, time.Now(), f.ID)
	return err
}

func UpdateFeedbackHandled(ctx context.Context, conn sqlx.SqlConn, id int64, handled int) error {
	_, err := execCtx(ctx, conn, "UPDATE ai_feedback SET handled = ? WHERE id = ?", handled, id)
	return err
}

func DeleteFeedback(ctx context.Context, conn sqlx.SqlConn, id int64) error {
	_, err := execCtx(ctx, conn, "DELETE FROM ai_feedback WHERE id = ?", id)
	return err
}

// UnanalyzedFeedbackIDs returns ids of rows that have never been analyzed,
// capped at `limit` so a bulk run never blows past the token budget at once.
func UnanalyzedFeedbackIDs(ctx context.Context, conn sqlx.SqlConn, limit int) ([]int64, error) {
	q := `SELECT id FROM ai_feedback WHERE sentiment = '' OR sentiment IS NULL ORDER BY id ASC LIMIT ?`
	var ids []int64
	if err := conn.QueryRowsPartialCtx(ctx, &ids, q, limit); err != nil {
		return nil, err
	}
	return ids, nil
}

// ============================ aggregates ============================

func FeedbackSentimentStats(ctx context.Context, conn sqlx.SqlConn) ([]*AiSentimentStat, error) {
	q := `SELECT sentiment, COUNT(*) AS cnt, IFNULL(AVG(score), 0) AS avg_score
	      FROM ai_feedback WHERE sentiment <> '' GROUP BY sentiment`
	var list []*AiSentimentStat
	if err := conn.QueryRowsCtx(ctx, &list, q); err != nil {
		return nil, err
	}
	return list, nil
}

func FeedbackRiskStats(ctx context.Context, conn sqlx.SqlConn) ([]*AiRiskStat, error) {
	q := `SELECT risk_level, COUNT(*) AS cnt
	      FROM ai_feedback WHERE risk_level <> '' GROUP BY risk_level`
	var list []*AiRiskStat
	if err := conn.QueryRowsCtx(ctx, &list, q); err != nil {
		return nil, err
	}
	return list, nil
}

func FeedbackSourceStats(ctx context.Context, conn sqlx.SqlConn) ([]*AiSourceStat, error) {
	q := `SELECT source, COUNT(*) AS cnt,
	         SUM(CASE WHEN sentiment = 'negative' THEN 1 ELSE 0 END) AS negative,
	         IFNULL(AVG(score), 0) AS avg_score
	      FROM ai_feedback GROUP BY source ORDER BY cnt DESC`
	var list []*AiSourceStat
	if err := conn.QueryRowsCtx(ctx, &list, q); err != nil {
		return nil, err
	}
	return list, nil
}

// AiOverview returns the scalar counters shown on the usage dashboard.
type AiOverview struct {
	TotalCalls     int64   `db:"total_calls" json:"totalCalls"`
	TodayCalls     int64   `db:"today_calls" json:"todayCalls"`
	TotalTokens    int64   `db:"total_tokens" json:"totalTokens"`
	MockedCalls    int64   `db:"mocked_calls" json:"mockedCalls"`
	AvgElapsed     float64 `db:"avg_elapsed" json:"avgElapsed"`
	FeedbackTotal  int64   `db:"feedback_total" json:"feedbackTotal"`
	FeedbackPending int64  `db:"feedback_pending" json:"feedbackPending"`
	HighRisk       int64   `db:"high_risk" json:"highRisk"`
}

func AiUsageOverview(ctx context.Context, conn sqlx.SqlConn) (*AiOverview, error) {
	q := `SELECT
	   (SELECT COUNT(*) FROM ai_chat_record) AS total_calls,
	   (SELECT COUNT(*) FROM ai_chat_record WHERE DATE(created_at) = CURDATE()) AS today_calls,
	   (SELECT IFNULL(SUM(total_tokens), 0) FROM ai_chat_record) AS total_tokens,
	   (SELECT COUNT(*) FROM ai_chat_record WHERE mocked = 1) AS mocked_calls,
	   (SELECT IFNULL(AVG(elapsed), 0) FROM ai_chat_record) AS avg_elapsed,
	   (SELECT COUNT(*) FROM ai_feedback) AS feedback_total,
	   (SELECT COUNT(*) FROM ai_feedback WHERE sentiment = '' OR sentiment IS NULL) AS feedback_pending,
	   (SELECT COUNT(*) FROM ai_feedback WHERE risk_level = 'high') AS high_risk`
	var o AiOverview
	if err := conn.QueryRowCtx(ctx, &o, q); err != nil {
		return nil, err
	}
	return &o, nil
}

func ChatTaskStats(ctx context.Context, conn sqlx.SqlConn) ([]*AiTaskStat, error) {
	q := `SELECT task, COUNT(*) AS cnt, IFNULL(SUM(total_tokens), 0) AS total_tokens,
	         IFNULL(AVG(elapsed), 0) AS avg_elapsed
	      FROM ai_chat_record GROUP BY task ORDER BY cnt DESC`
	var list []*AiTaskStat
	if err := conn.QueryRowsCtx(ctx, &list, q); err != nil {
		return nil, err
	}
	return list, nil
}

func ChatDailyStats(ctx context.Context, conn sqlx.SqlConn, days int) ([]*AiDailyStat, error) {
	q := `SELECT DATE_FORMAT(created_at, '%Y-%m-%d') AS d, COUNT(*) AS cnt,
	         IFNULL(SUM(total_tokens), 0) AS total_tokens, IFNULL(AVG(elapsed), 0) AS avg_elapsed
	      FROM ai_chat_record
	      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
	      GROUP BY d ORDER BY d ASC`
	var list []*AiDailyStat
	if err := conn.QueryRowsCtx(ctx, &list, q, days); err != nil {
		return nil, err
	}
	return list, nil
}

// ============================ ai_prompt_preset ============================

func ListPromptPresets(ctx context.Context, conn sqlx.SqlConn, scene string) ([]*AiPromptPreset, error) {
	q := `SELECT id, name, scene, template, sort, status, created_at
	      FROM ai_prompt_preset WHERE status = 1`
	args := []interface{}{}
	if scene != "" && scene != "all" {
		q += " AND scene = ?"
		args = append(args, scene)
	}
	q += " ORDER BY sort ASC, id ASC"
	var list []*AiPromptPreset
	if err := conn.QueryRowsCtx(ctx, &list, q, args...); err != nil {
		return nil, err
	}
	return list, nil
}
