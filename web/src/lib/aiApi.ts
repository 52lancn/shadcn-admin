import { get as httpGet, post as httpPost, put as httpPut, del as httpDel, type PageResult } from '@/lib/http'

// ============================================================
// AI 智能内容与运营模块
// ============================================================

export type AiTask = 'generate' | 'polish' | 'expand' | 'continue' | 'translate' | 'sentiment'
export type AiScene = 'general' | 'product' | 'email' | 'news'
export type AiSentiment = 'positive' | 'negative' | 'neutral'
export type AiRiskLevel = 'low' | 'medium' | 'high'

export const AI_TASK_LABELS: Record<string, string> = {
  generate: '内容生成',
  polish: '润色',
  expand: '扩写',
  continue: '续写',
  translate: '智能翻译',
  sentiment: '情感分析',
}

export const AI_SCENE_LABELS: Record<string, string> = {
  general: '通用',
  product: '商品文案',
  email: '营销邮件',
  news: '新闻公告',
  feedback: '用户评论',
}

export const AI_SENTIMENT_LABELS: Record<string, string> = {
  positive: '正向',
  negative: '负向',
  neutral: '中性',
}

export const AI_RISK_LABELS: Record<string, string> = {
  low: '低风险',
  medium: '中风险',
  high: '高危',
}

// ---- 通用生成 ----
export interface AiGenerateReq {
  task: 'generate' | 'polish' | 'expand' | 'continue'
  scene: AiScene
  prompt: string
  presetId?: number
  tone?: string
  audience?: string
  length?: string
  model?: string
}
export interface AiGenerateResp {
  content: string
  model: string
  vendor: string
  mocked: boolean
  elapsed: number
  totalTokens: number
  recordId: number
}

export interface AiPresetVO {
  id: number
  name: string
  scene: string
  template: string
  sort: number
  status: number
}

// ---- 翻译 ----
export interface AiTranslateReq {
  text: string
  target: string
  source?: string
  scene?: string
  terminology?: string
  model?: string
}
export interface AiTranslateResp {
  translation: string
  source: string
  target: string
  chars: number
  model: string
  vendor: string
  mocked: boolean
  elapsed: number
  totalTokens: number
  recordId: number
}

export interface AiTranslateRecord {
  translation: string
  source: string
  target: string
  createdAt: string
}

// ---- 情感分析 ----
export interface AiSentimentResp {
  sentiment: AiSentiment
  score: number
  confidence: number
  riskLevel: AiRiskLevel
  tags: string[]
  summary: string
  suggestion: string
  alert: boolean
  mocked: boolean
  model: string
  vendor: string
  elapsed: number
  feedbackId: number
}

export interface AiBulkAnalyzeResp {
  total: number
  succeed: number
  failed: number
  alerts: number
  negative: number
  positive: number
  neutral: number
  mocked: boolean
  results: AiSentimentResp[]
}

// ---- 舆情列表 ----
export interface AiFeedbackVO {
  id: number
  content: string
  source: string
  author: string
  rating: number
  product: string
  sentiment: string
  score: number
  confidence: number
  riskLevel: string
  tags: string
  summary: string
  suggestion: string
  handled: number
  createdAt: string
  analyzedAt: string
}

export interface AiFeedbackQuery {
  page?: number
  perPage?: number
  keyword?: string
  sentiment?: string
  riskLevel?: string
  source?: string
  handled?: string
}

export interface AiFeedbackCreateReq {
  content: string
  source?: string
  author?: string
  rating?: number
  product?: string
  autoAnalyze?: boolean
}

// ---- 用量 ----
export interface AiSentimentStatVO {
  sentiment: string
  cnt: number
  avgScore: number
}
export interface AiRiskStatVO {
  riskLevel: string
  cnt: number
}
export interface AiSourceStatVO {
  source: string
  cnt: number
  negative: number
  avgScore: number
}
export interface AiTaskStatVO {
  task: string
  cnt: number
  totalTokens: number
  avgElapsed: number
}
export interface AiDailyStatVO {
  date: string
  cnt: number
  totalTokens: number
  avgElapsed: number
}

export interface AiUsage {
  totalCalls: number
  todayCalls: number
  totalTokens: number
  mockedCalls: number
  avgElapsed: number
  feedbackTotal: number
  feedbackPending: number
  highRisk: number
  sentiment: AiSentimentStatVO[]
  risk: AiRiskStatVO[]
  source: AiSourceStatVO[]
  task: AiTaskStatVO[]
  daily: AiDailyStatVO[]
}

export interface AiRecordVO {
  id: number
  task: string
  taskLabel: string
  scene: string
  model: string
  vendor: string
  promptTokens: number
  completionTokens: number
  totalTokens: number
  elapsed: number
  mocked: number
  input: string
  output: string
  userId: number
  createdAt: string
}

export interface AiStatus {
  enabled: boolean
  vendor: string
  model: string
  temperature: number
  maxTokens: number
  record: boolean
  hint: string
}

export const AiAPI = {
  // AIGC
  generate: (b: AiGenerateReq) => httpPost<AiGenerateResp>('/ai/generate', b as never),
  presets: (scene?: string) => httpGet<AiPresetVO[]>('/ai/presets', { scene }),

  // 翻译
  translate: (b: AiTranslateReq) => httpPost<AiTranslateResp>('/ai/translate', b as never),

  // 情感分析
  analyze: (b: { content?: string; feedbackId?: number; persist?: boolean }) =>
    httpPost<AiSentimentResp>('/ai/sentiment/analyze', b as never),
  bulkAnalyze: (limit = 50) =>
    httpPost<AiBulkAnalyzeResp>(`/ai/sentiment/bulk?limit=${limit}`),

  // 舆情列表
  feedbackList: (q: AiFeedbackQuery) => httpGet<PageResult<AiFeedbackVO>>('/ai/feedback', q as Record<string, unknown>),
  feedbackCreate: (b: AiFeedbackCreateReq) => httpPost<AiFeedbackVO>('/ai/feedback', b as never),
  feedbackSetHandled: (id: number, handled: 0 | 1) => httpPut(`/ai/feedback/${id}`, { handled }),
  feedbackRemove: (id: number) => httpDel(`/ai/feedback/${id}`),
  feedbackSources: () => httpGet<string[]>('/ai/feedback/sources'),
  alerts: (limit = 20) => httpGet<AiFeedbackVO[]>('/ai/alerts', { limit }),

  // 用量
  usage: (days = 30) => httpGet<AiUsage>('/ai/usage', { days }),
  records: (q: { page?: number; perPage?: number; task?: string }) =>
    httpGet<PageResult<AiRecordVO>>('/ai/records', q as Record<string, unknown>),
  recordRemove: (id: number) => httpDel(`/ai/records/${id}`),
  recordsClear: () => httpDel('/ai/records'),
  status: () => httpGet<AiStatus>('/ai/status'),
}
