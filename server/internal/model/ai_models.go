package model

import (
	"database/sql"
	"time"
)

// AiChatRecord - one row per AI invocation (generate / polish / expand /
// continue / translate / sentiment). Drives the usage dashboard.
type AiChatRecord struct {
	ID               int64     `db:"id" json:"id"`
	Task             string    `db:"task" json:"task"`
	Scene            string    `db:"scene" json:"scene"`
	Model            string    `db:"model" json:"model"`
	Vendor           string    `db:"vendor" json:"vendor"`
	PromptTokens     int       `db:"prompt_tokens" json:"promptTokens"`
	CompletionTokens int       `db:"completion_tokens" json:"completionTokens"`
	TotalTokens      int       `db:"total_tokens" json:"totalTokens"`
	Elapsed          int       `db:"elapsed" json:"elapsed"`
	Mocked           int       `db:"mocked" json:"mocked"`
	Input            string    `db:"input" json:"input"`
	Output           string    `db:"output" json:"output"`
	UserID           int64     `db:"user_id" json:"userId"`
	CreatedAt        time.Time `db:"created_at" json:"createdAt"`
}

// AiFeedback - a user comment / support ticket fed into sentiment analysis.
type AiFeedback struct {
	ID         int64      `db:"id" json:"id"`
	Content    string     `db:"content" json:"content"`
	Source     string     `db:"source" json:"source"`
	Author     string     `db:"author" json:"author"`
	Rating     int        `db:"rating" json:"rating"`
	Product    string     `db:"product" json:"product"`
	Sentiment  string     `db:"sentiment" json:"sentiment"`
	Score      float64    `db:"score" json:"score"`
	Confidence float64    `db:"confidence" json:"confidence"`
	RiskLevel  string     `db:"risk_level" json:"riskLevel"`
	Tags       string     `db:"tags" json:"tags"`
	Summary    string     `db:"summary" json:"summary"`
	Suggestion string     `db:"suggestion" json:"suggestion"`
	Handled    int        `db:"handled" json:"handled"`
	CreatedAt  time.Time    `db:"created_at" json:"createdAt"`
	// sql.NullTime (not *time.Time): go-zero's row mapper pre-allocates
	// pointer fields, so a NULL column cannot be scanned into *time.Time.
	AnalyzedAt sql.NullTime `db:"analyzed_at" json:"analyzedAt"`
}

// AiPromptPreset - a reusable scenario template.
type AiPromptPreset struct {
	ID        int64     `db:"id" json:"id"`
	Name      string    `db:"name" json:"name"`
	Scene     string    `db:"scene" json:"scene"`
	Template  string    `db:"template" json:"template"`
	Sort      int       `db:"sort" json:"sort"`
	Status    int       `db:"status" json:"status"`
	CreatedAt time.Time `db:"created_at" json:"createdAt"`
}

// ---- aggregation row shapes ----

// AiSentimentStat is one sentiment bucket with its share and average score.
type AiSentimentStat struct {
	Sentiment string  `db:"sentiment" json:"sentiment"`
	Cnt       int64   `db:"cnt" json:"cnt"`
	AvgScore  float64 `db:"avg_score" json:"avgScore"`
}

// AiRiskStat is one risk-level bucket.
type AiRiskStat struct {
	RiskLevel string `db:"risk_level" json:"riskLevel"`
	Cnt       int64  `db:"cnt" json:"cnt"`
}

// AiTaskStat aggregates usage per task type over a window.
type AiTaskStat struct {
	Task        string `db:"task" json:"task"`
	Cnt         int64  `db:"cnt" json:"cnt"`
	TotalTokens int64  `db:"total_tokens" json:"totalTokens"`
	AvgElapsed  int64  `db:"avg_elapsed" json:"avgElapsed"`
}

// AiDailyStat is a per-day usage point for the trend chart.
type AiDailyStat struct {
	Date        string  `db:"d" json:"date"`
	Cnt         int64   `db:"cnt" json:"cnt"`
	TotalTokens int64   `db:"total_tokens" json:"totalTokens"`
	AvgElapsed  float64 `db:"avg_elapsed" json:"avgElapsed"`
}

// AiSourceStat groups feedback by channel.
type AiSourceStat struct {
	Source     string  `db:"source" json:"source"`
	Cnt        int64   `db:"cnt" json:"cnt"`
	Negative   int64   `db:"negative" json:"negative"`
	AvgScore   float64 `db:"avg_score" json:"avgScore"`
}
