package types

// ============================================================
// AI 智能内容与运营模块
// ============================================================

// ---- 通用生成（内容生成 / 润色 / 扩写 / 续写）----

// AiTask identifies the AI operation.
const (
	AiTaskGenerate = "generate"
	AiTaskPolish   = "polish"
	AiTaskExpand   = "expand"
	AiTaskContinue = "continue"
	AiTaskTrans    = "translate"
	AiTaskSenti    = "sentiment"
)

type AiGenerateReq struct {
	// Task: generate | polish | expand | continue
	Task string `json:"task"`
	// Scene: product | email | news | general
	Scene string `json:"scene,optional"`
	// Prompt is the instruction / topic. For polish/expand/continue it holds
	// the source text.
	Prompt string `json:"prompt,optional"`
	// PresetID, when > 0, pre-fills Prompt from a saved template.
	PresetID int64 `json:"presetId,optional"`
	// Tone: professional | friendly | energetic | concise | formal
	Tone string `json:"tone,optional"`
	// Audience narrows who the copy is written for.
	Audience string `json:"audience,optional"`
	// Length: short | medium | long
	Length string `json:"length,optional"`
	// Model overrides the server default for a single call.
	Model string `json:"model,optional"`
}

type AiGenerateResp struct {
	Content   string `json:"content"`
	Model     string `json:"model"`
	Vendor    string `json:"vendor"`
	Mocked    bool   `json:"mocked"`
	Elapsed   int64  `json:"elapsed"`
	TotalTokens int  `json:"totalTokens"`
	RecordID  int64  `json:"recordId"`
}

// ---- 智能翻译 ----

type AiTranslateReq struct {
	// Text may contain multiple lines / \n separated blocks; the backend
	// translates them together to keep context.
	Text string `json:"text"`
	// Target is the target language name, e.g. English / 日本語 / Español.
	Target string `json:"target"`
	// Source is optional; auto-detected when empty.
	Source      string `json:"source,optional"`
	Scene       string `json:"scene,optional"` // general | product | email | news
	Model       string `json:"model,optional"`
	// Terminology: comma separated "源词=目标词" pairs to force wording.
	Terminology string `json:"terminology,optional"`
}

type AiTranslateResp struct {
	Translation string `json:"translation"`
	Source      string `json:"source"`
	Target      string `json:"target"`
	Chars       int    `json:"chars"`
	Model       string `json:"model"`
	Vendor      string `json:"vendor"`
	Mocked      bool   `json:"mocked"`
	Elapsed     int64  `json:"elapsed"`
	TotalTokens int    `json:"totalTokens"`
	RecordID    int64  `json:"recordId"`
}

// ---- 舆情与情感分析 ----

type AiSentimentAnalyzeReq struct {
	// Content is the raw comment text. Mutually exclusive with FeedbackID.
	Content string `json:"content,optional"`
	// FeedbackID analyzes a stored feedback row and persists the verdict.
	FeedbackID int64 `json:"feedbackId,optional"`
	// Persist writes the result onto the stored feedback row.
	Persist bool   `json:"persist,optional"`
	Model   string `json:"model,optional"`
}

type AiSentimentResp struct {
	Sentiment  string   `json:"sentiment"`  // positive | negative | neutral
	Score      float64  `json:"score"`      // -1 .. 1
	Confidence float64  `json:"confidence"` // 0 .. 1
	RiskLevel  string   `json:"riskLevel"`  // low | medium | high
	Tags       []string `json:"tags"`
	Summary    string   `json:"summary"`
	Suggestion string   `json:"suggestion"`
	Alert      bool     `json:"alert"` // true when riskLevel == high
	Mocked     bool     `json:"mocked"`
	Model      string   `json:"model"`
	Vendor     string   `json:"vendor"`
	Elapsed    int64    `json:"elapsed"`
	FeedbackID int64    `json:"feedbackId"`
}

// AiFeedbackVO is the list row for the sentiment console.
type AiFeedbackVO struct {
	ID         int64   `json:"id"`
	Content    string  `json:"content"`
	Source     string  `json:"source"`
	Author     string  `json:"author"`
	Rating     int     `json:"rating"`
	Product    string  `json:"product"`
	Sentiment  string  `json:"sentiment"`
	Score      float64 `json:"score"`
	Confidence float64 `json:"confidence"`
	RiskLevel  string  `json:"riskLevel"`
	Tags       string  `json:"tags"`
	Summary    string  `json:"summary"`
	Suggestion string  `json:"suggestion"`
	Handled    int     `json:"handled"`
	CreatedAt  string  `json:"createdAt"`
	AnalyzedAt string  `json:"analyzedAt"`
}

type AiFeedbackListReq struct {
	Page     int    `form:"page,default=1,optional"`
	PerPage  int    `form:"perPage,default=10,optional"`
	Keyword  string `form:"keyword,optional"`
	Sentiment string `form:"sentiment,optional"`
	RiskLevel string `form:"riskLevel,optional"`
	Source    string `form:"source,optional"`
	Handled   string `form:"handled,optional"` // "" | 0 | 1
}

type AiFeedbackCreateReq struct {
	Content string `json:"content"`
	Source  string `json:"source,optional"`
	Author  string `json:"author,optional"`
	Rating  int    `json:"rating,optional"`
	Product string `json:"product,optional"`
	// AutoAnalyze runs sentiment analysis right after insert.
	AutoAnalyze bool `json:"autoAnalyze,optional"`
}

type AiFeedbackUpdateReq struct {
	Handled *int `json:"handled,optional"`
}

// ---- 概览与用量 ----

type AiRecordVO struct {
	ID               int64  `json:"id"`
	Task             string `json:"task"`
	TaskLabel        string `json:"taskLabel"`
	Scene            string `json:"scene"`
	Model            string `json:"model"`
	Vendor           string `json:"vendor"`
	PromptTokens     int    `json:"promptTokens"`
	CompletionTokens int    `json:"completionTokens"`
	TotalTokens      int    `json:"totalTokens"`
	Elapsed          int    `json:"elapsed"`
	Mocked           int    `json:"mocked"`
	Input            string `json:"input"`
	Output           string `json:"output"`
	UserID           int64  `json:"userId"`
	CreatedAt        string `json:"createdAt"`
}

type AiRecordListReq struct {
	Page    int    `form:"page,default=1,optional"`
	PerPage int    `form:"perPage,default=10,optional"`
	Task    string `form:"task,optional"`
}

type AiPresetVO struct {
	ID       int64  `json:"id"`
	Name     string `json:"name"`
	Scene    string `json:"scene"`
	Template string `json:"template"`
	Sort     int    `json:"sort"`
	Status   int    `json:"status"`
}

type AiUsageVO struct {
	// scalars
	TotalCalls      int64   `json:"totalCalls"`
	TodayCalls      int64   `json:"todayCalls"`
	TotalTokens     int64   `json:"totalTokens"`
	MockedCalls     int64   `json:"mockedCalls"`
	AvgElapsed      float64 `json:"avgElapsed"`
	FeedbackTotal   int64   `json:"feedbackTotal"`
	FeedbackPending int64   `json:"feedbackPending"`
	HighRisk        int64   `json:"highRisk"`

	// breakdowns
	Sentiment []AiSentimentStatVO `json:"sentiment"`
	Risk      []AiRiskStatVO      `json:"risk"`
	Source    []AiSourceStatVO    `json:"source"`
	Task      []AiTaskStatVO      `json:"task"`
	Daily     []AiDailyStatVO     `json:"daily"`
}

type AiSentimentStatVO struct {
	Sentiment string  `json:"sentiment"`
	Cnt       int64   `json:"cnt"`
	AvgScore  float64 `json:"avgScore"`
}

type AiRiskStatVO struct {
	RiskLevel string `json:"riskLevel"`
	Cnt       int64  `json:"cnt"`
}

type AiSourceStatVO struct {
	Source   string  `json:"source"`
	Cnt      int64   `json:"cnt"`
	Negative int64   `json:"negative"`
	AvgScore float64 `json:"avgScore"`
}

type AiTaskStatVO struct {
	Task        string `json:"task"`
	Cnt         int64  `json:"cnt"`
	TotalTokens int64  `json:"totalTokens"`
	AvgElapsed  int64  `json:"avgElapsed"`
}

type AiDailyStatVO struct {
	Date        string  `json:"date"`
	Cnt         int64   `json:"cnt"`
	TotalTokens int64   `json:"totalTokens"`
	AvgElapsed  float64 `json:"avgElapsed"`
}

type AiStatusVO struct {
	Enabled     bool    `json:"enabled"`
	Vendor      string  `json:"vendor"`
	Model       string  `json:"model"`
	Temperature float64 `json:"temperature"`
	MaxTokens   int     `json:"maxTokens"`
	Record      bool    `json:"record"`
	Hint        string  `json:"hint"`
}

// AiBulkAnalyzeResp reports the outcome of a batch sentiment run.
type AiBulkAnalyzeResp struct {
	Total    int64              `json:"total"`
	Succeed  int64              `json:"succeed"`
	Failed   int64              `json:"failed"`
	Alerts   int64              `json:"alerts"`
	Negative int64              `json:"negative"`
	Positive int64              `json:"positive"`
	Neutral  int64              `json:"neutral"`
	Mocked   bool               `json:"mocked"`
	Results  []AiSentimentResp  `json:"results"`
}
