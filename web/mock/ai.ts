import type { MockMethod } from 'vite-plugin-mock'

/* ============================================================
 * AI 智能内容与运营 —— Mock 预览数据
 *
 * 覆盖 /api/ai/* 全部接口，使 mock 轨道（VITE_USE_MOCK=true）下
 * 四个 AI 页面可直接预览：
 *   - 内容生成 / 智能翻译 / 舆情情感 / AI 用量
 *
 * 设计要点：
 *   - 情感分析是「真分析」：按关键词实时判定输入文本的情绪与风险，
 *     演示时输入不同评论会得到不同结论（非写死返回）。
 *   - 舆情数据为内存态：新增 / 标记处理 / 删除在当前会话内生效，
 *     刷新后回到种子数据（与 mock 轨道「无持久化」定位一致）。
 *   - 每次生成 / 翻译 / 分析都会追加一条用量记录，AI 用量页的
 *     统计、趋势图、记录表随之实时增长。
 * ============================================================ */

/* ---------- 工具 ---------- */
type Req = {
  url: string
  query: Record<string, string>
  body: any
  headers: Record<string, string>
}

const ok = <T,>(data: T) => ({ code: 0, message: 'success', data })

function num(v: unknown, def: number): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : def
}

function paginate<T>(rows: T[], page: number, perPage: number) {
  const total = rows.length
  const start = (page - 1) * perPage
  return { list: rows.slice(start, start + perPage), total, page, perPage }
}

function now(): string {
  return new Date().toISOString().slice(0, 19).replace('T', ' ')
}

function daysAgo(n: number): string {
  const d = new Date(Date.now() - n * 86400000)
  return d.toISOString().slice(0, 19).replace('T', ' ')
}

/** 粗略 token 估算：中文约 1 字 1 token，英文约 4 字符 1 token */
function estTokens(text: string): number {
  if (!text) return 0
  const cjk = (text.match(/[\u4e00-\u9fff]/g) || []).length
  const rest = text.length - cjk
  return cjk + Math.ceil(rest / 4)
}

/* ---------- 模型接入状态（演示「已接入」态） ---------- */
const AI_STATUS = {
  enabled: true,
  vendor: 'GitHub Models',
  model: 'openai/gpt-4o-mini',
  temperature: 0.7,
  maxTokens: 2048,
  record: true,
  hint: '当前为 Mock 预览数据：模型状态展示「已接入」效果，生成内容为演示文案。',
}

/* ---------- 场景模板预设（对应 ai_prompt_preset 种子） ---------- */
interface Preset {
  id: number
  name: string
  scene: string
  template: string
  sort: number
  status: number
}

const presets: Preset[] = [
  { id: 1, name: '小红书种草文案', scene: 'product', template: '为「{{product}}」写一篇小红书风格的种草笔记，语气真实、有个人体验、不要广告腔，300 字以内。', sort: 1, status: 1 },
  { id: 2, name: '电商详情页卖点', scene: 'product', template: '为「{{product}}」撰写电商详情页文案，围绕「{{benefit}}」提炼 3 个核心卖点，每点配一句场景化描述。', sort: 2, status: 1 },
  { id: 3, name: '新品上市邮件', scene: 'email', template: '以「{{product}}」新品上市为主题写一封营销邮件，含主题行、开场、卖点、CTA，控制在 200 字内。', sort: 3, status: 1 },
  { id: 4, name: '会员召回邮件', scene: 'email', template: '写给 30 天未下单会员的召回邮件，语气亲切不打扰，突出「{{benefit}}」并给出限时权益。', sort: 4, status: 1 },
  { id: 5, name: '产品更新公告', scene: 'news', template: '撰写「{{product}}」版本更新公告，面向现有用户，说明改进点与升级方式，正式简明。', sort: 5, status: 1 },
  { id: 6, name: '活动预告新闻', scene: 'news', template: '为即将开始的「{{product}}」促销活动写一篇新闻稿，含活动时间、玩法与参与方式。', sort: 6, status: 1 },
  { id: 7, name: '通用润色', scene: 'general', template: '润色以下文本，保留原意，去冗降赘，使表达更专业流畅：\n\n{{content}}', sort: 7, status: 1 },
  { id: 8, name: '通用扩写', scene: 'general', template: '扩写以下文本，补充细节、场景与数据支撑，篇幅扩展至原文两倍：\n\n{{content}}', sort: 8, status: 1 },
  { id: 9, name: '通用续写', scene: 'general', template: '续写以下文本，保持语气与结构一致，自然收尾：\n\n{{content}}', sort: 9, status: 1 },
]

/* ---------- 舆情语料（对应 ai_feedback 种子，覆盖四档情绪/风险） ---------- */
interface Feedback {
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

function fb(
  id: number, content: string, source: string, author: string, rating: number, product: string,
  sentiment: string, score: number, riskLevel: string, tags: string, summary: string, suggestion: string,
  handled: number, createdAt: string,
): Feedback {
  return {
    id, content, source, author, rating, product,
    sentiment, score, confidence: 0.72, riskLevel, tags, summary, suggestion,
    handled, createdAt, analyzedAt: createdAt,
  }
}

let feedbacks: Feedback[] = [
  fb(1, '耳机降噪效果超出预期，地铁上终于清净了，续航也很给力，值得推荐！', '商城评论', '耳机发烧友', 5, '降噪蓝牙耳机 Pro', 'positive', 0.6, 'low', '正面词命中', '命中正面词 3 次、负面词 0 次、高危词 0 处，整体倾向「正向」。', '正向反馈，建议邀请用户参与评价晒单或会员口碑计划。', 0, daysAgo(6)),
  fb(2, '物流很快，包装也精致，客服响应及时，整体体验满意。', '商城评论', '回头客小林', 5, '智能运动手表', 'positive', 0.4, 'low', '正面词命中', '命中正面词 2 次、负面词 0 次、高危词 0 处，整体倾向「正向」。', '正向反馈，建议邀请用户参与评价晒单或会员口碑计划。', 0, daysAgo(6)),
  fb(3, '发票开错了，重开一次可以吗？', '客服工单', '财务小王', 3, '便携投影仪', 'neutral', 0, 'low', '无明显情绪词', '命中正面词 0 次、负面词 0 次、高危词 0 处，整体倾向「中性」。', '中性内容，可归档，无需即时处理。', 1, daysAgo(5)),
  fb(4, '第二次购买了，质量一如既往地好，家人很喜欢。', '商城评论', '复购用户', 5, '记忆棉护颈枕', 'positive', 0.4, 'low', '正面词命中', '命中正面词 2 次、负面词 0 次、高危词 0 处，整体倾向「正向」。', '正向反馈，建议邀请用户参与评价晒单或会员口碑计划。', 0, daysAgo(5)),
  fb(5, '请问这个支持七天无理由退换货吗？', '客服工单', '咨询用户', 3, '客制化机械键盘', 'neutral', 0, 'low', '无明显情绪词', '命中正面词 0 次、负面词 0 次、高危词 0 处，整体倾向「中性」。', '中性内容，可归档，无需即时处理。', 1, daysAgo(5)),
  fb(6, '颜色和图片有色差，有点失望，希望能改进品控。', '商城评论', '挑剔的猫', 2, '北欧陶瓷餐具', 'negative', -0.25, 'medium', '负面词命中', '命中正面词 0 次、负面词 1 次、高危词 0 处，整体倾向「负向」。', '负向反馈，建议客服主动联系用户核实问题，48 小时内反馈处理结果。', 0, daysAgo(4)),
  fb(7, '什么时候补货？等了好几天了。', '商城评论', '蹲守玩家', 3, '碳纤维登山杖', 'neutral', 0, 'low', '无明显情绪词', '命中正面词 0 次、负面词 0 次、高危词 0 处，整体倾向「中性」。', '中性内容，可归档，无需即时处理。', 0, daysAgo(4)),
  fb(8, '价格比别家贵了一截，功能却没多大差别，感觉不值。', '社交媒体', '理性消费者', 2, '声波电动牙刷', 'negative', -0.5, 'medium', '负面词命中', '命中正面词 0 次、负面词 2 次、高危词 0 处，整体倾向「负向」。', '负向反馈，建议客服主动联系用户核实问题，48 小时内反馈处理结果。', 0, daysAgo(4)),
  fb(9, '手表连 APP 经常断连，固件升级后还是老问题。', '商城评论', '运动达人', 2, '智能运动手表', 'negative', -0.25, 'medium', '负面词命中', '命中正面词 0 次、负面词 1 次、高危词 0 处，整体倾向「负向」。', '负向反馈，建议客服主动联系用户核实问题，48 小时内反馈处理结果。', 1, daysAgo(3)),
  fb(10, '物流太慢了，等了一个星期才到，客服还爱答不理的，非常失望！', '售后反馈', '等等党', 1, '降噪蓝牙耳机 Pro', 'negative', -0.5, 'medium', '负面词命中', '命中正面词 0 次、负面词 2 次、高危词 0 处，整体倾向「负向」。', '负向反馈，建议客服主动联系用户核实问题，48 小时内反馈处理结果。', 0, daysAgo(3)),
  fb(11, '包装破损，商品有磕碰，要求换货。', '售后反馈', '磕碰了', 2, '扫地机器人', 'negative', -0.25, 'medium', '负面词命中', '命中正面词 0 次、负面词 1 次、高危词 0 处，整体倾向「负向」。', '负向反馈，建议客服主动联系用户核实问题，48 小时内反馈处理结果。', 0, daysAgo(3)),
  fb(12, '用了两天就坏，联系售后无人处理，这种质量也敢卖？', '售后反馈', '愤怒的用户', 1, '桌面蓝牙音箱', 'negative', -0.75, 'medium', '负面词命中', '命中正面词 0 次、负面词 3 次、高危词 0 处，整体倾向「负向」。', '负向反馈，建议客服主动联系用户核实问题，48 小时内反馈处理结果。', 0, daysAgo(2)),
  fb(13, '质量很好，物流也快，推荐购买！', '商城评论', '测试用户', 5, '降噪蓝牙耳机 Pro', 'positive', 0.6, 'low', '正面词命中', '命中正面词 3 次、负面词 0 次、高危词 0 处，整体倾向「正向」。', '正向反馈，建议邀请用户参与评价晒单或会员口碑计划。', 0, daysAgo(1)),
  fb(14, '拖延发货拖延退款，已经超过承诺时限了，再不处理我就找媒体曝光！', '社交媒体', '老张维权', 1, '电动牙刷', 'negative', -0.25, 'high', '负面词命中、高危词命中', '命中正面词 0 次、负面词 1 次、高危词 1 处，整体倾向「负向」。', '疑似恶意投诉/维权言论，建议 30 分钟内人工介入，先致歉安抚并给出明确处理时限。', 0, daysAgo(1)),
  fb(15, '虚假宣传！说好的终身质保不认账，已经投诉到消协了，等着应诉吧！', '社交媒体', '较真到底', 1, '4K 高清摄像头', 'negative', -0.25, 'high', '负面词命中、高危词命中', '命中正面词 0 次、负面词 1 次、高危词 5 处，整体倾向「负向」。', '疑似恶意投诉/维权言论，建议 30 分钟内人工介入，先致歉安抚并给出明确处理时限。', 0, daysAgo(1)),
  fb(16, '东西不错但是发票一直开不出来，再拖我就打 12315 举报。', '客服工单', '财税会计', 2, '移动固态硬盘', 'negative', -0.25, 'high', '负面词命中、高危词命中', '命中正面词 0 次、负面词 1 次、高危词 1 处，整体倾向「负向」。', '疑似恶意投诉/维权言论，建议 30 分钟内人工介入，先致歉安抚并给出明确处理时限。', 0, daysAgo(0)),
]

/* ---------- 情感分析引擎（关键词实时判定，与后端本地兜底同策略） ---------- */
const POS_WORDS = ['好评', '不错', '喜欢', '推荐', '满意', '好用', '值得', '精致', '舒服', '棒', '优秀', '完美', '惊艳', '质感', '顺滑', '给力', '超预期', '一如既往']
const NEG_WORDS = ['差评', '失望', '垃圾', '坑', '骗', '退货', '投诉', '客服', '坏', '破', '磕碰', '拖延', '无人', '敷衍', '慢', '贵', '吵', '麻烦', '假', '色差', '断连', '不值']
const RISK_WORDS = ['曝光', '媒体', '起诉', '维权', '举报', '消协', '工商', '律师', '法院', '12315', '索赔', '追究', '法律责任', '公开', '应诉']

function countHits(text: string, words: string[]): number {
  let n = 0
  for (const w of words) {
    let idx = text.indexOf(w)
    while (idx >= 0) {
      n += 1
      idx = text.indexOf(w, idx + w.length)
    }
  }
  return n
}

function analyze(text: string) {
  const pos = countHits(text, POS_WORDS)
  const neg = countHits(text, NEG_WORDS)
  const risk = countHits(text, RISK_WORDS)

  let sentiment = 'neutral'
  let score = 0
  if (pos > neg) {
    sentiment = 'positive'
    score = Math.min(1, (pos - neg) * 0.25 + 0.2)
  } else if (neg > pos) {
    sentiment = 'negative'
    score = -Math.min(1, (neg - pos) * 0.25 + 0.15)
  }

  let riskLevel = 'low'
  if (risk > 0) riskLevel = 'high'
  else if (sentiment === 'negative') riskLevel = 'medium'

  const tags: string[] = []
  if (pos > 0) tags.push('正面词命中')
  if (neg > 0) tags.push('负面词命中')
  if (risk > 0) tags.push('高危词命中')
  if (tags.length === 0) tags.push('无明显情绪词')

  const summary = `命中正面词 ${pos} 次、负面词 ${neg} 次、高危词 ${risk} 处，整体倾向「${
    sentiment === 'positive' ? '正向' : sentiment === 'negative' ? '负向' : '中性'
  }」。`

  let suggestion = '中性内容，可归档，无需即时处理。'
  if (riskLevel === 'high') {
    suggestion = '疑似恶意投诉/维权言论，建议 30 分钟内人工介入，先致歉安抚并给出明确处理时限。'
  } else if (sentiment === 'negative') {
    suggestion = '负向反馈，建议客服主动联系用户核实问题，48 小时内反馈处理结果。'
  } else if (sentiment === 'positive') {
    suggestion = '正向反馈，建议邀请用户参与评价晒单或会员口碑计划。'
  }

  return {
    sentiment,
    score: Math.round(score * 100) / 100,
    confidence: 0.72,
    riskLevel,
    tags,
    summary,
    suggestion,
    alert: riskLevel === 'high',
  }
}

/* ---------- 用量记录（每次 AI 调用追加，刷新后回到种子） ---------- */
interface Record {
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

const TASK_LABELS: Record<string, string> = {
  generate: '内容生成',
  polish: '文本润色',
  expand: '内容扩写',
  continue: '内容续写',
  translate: '智能翻译',
  sentiment: '情感分析',
}

let records: Record[] = [
  { id: 1, task: 'generate', taskLabel: '内容生成', scene: 'product', model: 'openai/gpt-4o-mini', vendor: 'GitHub Models', promptTokens: 96, completionTokens: 218, totalTokens: 314, elapsed: 1240, mocked: 0, input: '为「降噪蓝牙耳机 Pro」写电商详情页文案', output: '【降噪蓝牙耳机 Pro · 详情页文案】…', userId: 1, createdAt: daysAgo(6) },
  { id: 2, task: 'translate', taskLabel: '智能翻译', scene: 'general', model: 'openai/gpt-4o-mini', vendor: 'GitHub Models', promptTokens: 52, completionTokens: 128, totalTokens: 180, elapsed: 860, mocked: 0, input: '[Auto→English] 本店新品上市，全场包邮', output: 'New arrivals are now live. Free shipping storewide…', userId: 1, createdAt: daysAgo(6) },
  { id: 3, task: 'sentiment', taskLabel: '情感分析', scene: 'feedback', model: 'openai/gpt-4o-mini', vendor: 'GitHub Models', promptTokens: 148, completionTokens: 86, totalTokens: 234, elapsed: 640, mocked: 0, input: '物流太慢了，等了一个星期才到…', output: 'negative / medium / score=-0.5', userId: 1, createdAt: daysAgo(5) },
  { id: 4, task: 'generate', taskLabel: '内容生成', scene: 'email', model: 'openai/gpt-4o-mini', vendor: 'GitHub Models', promptTokens: 88, completionTokens: 196, totalTokens: 284, elapsed: 1120, mocked: 0, input: '新品上市营销邮件，主题：秋季限定礼盒', output: '【主题】秋季限定礼盒已上线｜会员专享 8 折…', userId: 1, createdAt: daysAgo(4) },
  { id: 5, task: 'polish', taskLabel: '文本润色', scene: 'general', model: 'openai/gpt-4o-mini', vendor: 'GitHub Models', promptTokens: 210, completionTokens: 240, totalTokens: 450, elapsed: 1580, mocked: 0, input: '润色：我们这个产品是非常好的欢迎大家购买', output: '【润色后】本产品在工艺与体验上均属上乘…', userId: 1, createdAt: daysAgo(3) },
  { id: 6, task: 'sentiment', taskLabel: '情感分析', scene: 'feedback', model: 'openai/gpt-4o-mini', vendor: 'GitHub Models', promptTokens: 132, completionTokens: 92, totalTokens: 224, elapsed: 700, mocked: 0, input: '拖延发货拖延退款，已经超过承诺时限了…', output: 'negative / high / score=-0.25', userId: 1, createdAt: daysAgo(2) },
  { id: 7, task: 'translate', taskLabel: '智能翻译', scene: 'product', model: 'openai/gpt-4o-mini', vendor: 'GitHub Models', promptTokens: 76, completionTokens: 164, totalTokens: 240, elapsed: 920, mocked: 0, input: '[Auto→日本語] 七天无理由退换货', output: '理由の如何を問わず、7日以内の返品・交換に対応…', userId: 1, createdAt: daysAgo(1) },
  { id: 8, task: 'generate', taskLabel: '内容生成', scene: 'news', model: 'openai/gpt-4o-mini', vendor: 'GitHub Models', promptTokens: 92, completionTokens: 224, totalTokens: 316, elapsed: 1360, mocked: 0, input: '产品更新公告：v2.4 版本新增多语言支持', output: '【更新公告】v2.4 版本正式发布…', userId: 1, createdAt: daysAgo(0) },
]

let recordSeq = records.length

function appendRecord(task: string, scene: string, input: string, output: string) {
  recordSeq += 1
  const promptTokens = estTokens(input)
  const completionTokens = estTokens(output)
  records.unshift({
    id: recordSeq,
    task,
    taskLabel: TASK_LABELS[task] ?? task,
    scene,
    model: AI_STATUS.model,
    vendor: AI_STATUS.vendor,
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
    elapsed: 600 + Math.floor(Math.random() * 1200),
    mocked: 0,
    input: input.length > 60 ? input.slice(0, 60) + '…' : input,
    output: output.length > 60 ? output.slice(0, 60) + '…' : output,
    userId: 1,
    createdAt: now(),
  })
}

/* ---------- 内容生成（结构化演示文案） ---------- */
function generateContent(task: string, scene: string, prompt: string, tone: string, audience: string, length: string): string {
  const p = (prompt || '（未填写主题）').trim()
  const toneLabel = { professional: '专业严谨', friendly: '亲切自然', energetic: '有感染力', concise: '极简克制', formal: '正式书面' }[tone] ?? '专业严谨'
  const audienceLabel = audience || '大众用户'
  const head = `【${scene === 'product' ? '商品文案' : scene === 'email' ? '营销邮件' : scene === 'news' ? '新闻公告' : '通用写作'} · ${TASK_LABELS[task] ?? task}】`

  if (task !== 'generate') {
    return `${head}\n\n${p}\n\n——— ${TASK_LABELS[task] ?? task}后 ———\n\n${p.length > 40 ? p : p + '（此处展示处理后的文本：语义完整保留，表达更专业流畅，冗余信息已剔除，重点更为突出。）'}`
  }

  if (scene === 'product') {
    return `${head}\n\n■ 主标题\n${p}\n\n■ 核心卖点\n1. 场景切入：为${audienceLabel}的真实使用场景而生，痛点即卖点；\n2. 品质背书：工艺细节与耐用性双重保障，经得起长时间使用；\n3. 价值感知：同级配置更优价格，决策成本低。\n\n■ 文案正文\n${p}——不止于参数，更在于每一次使用时的顺手与安心。${toneLabel}的语气，讲给${audienceLabel}听。`
  }
  if (scene === 'email') {
    return `${head}\n\n【主题】${p}\n\n${audienceLabel}，你好：\n\n${p}。本次为你准备了专属权益，点击即可查看详情。\n\n· 权益一：限时折扣\n· 权益二：包邮到家\n\n【立即查看】\n\n—— 如需退订请点击邮件底部链接。`
  }
  if (scene === 'news') {
    return `${head}\n\n【标题】${p}\n\n【正文】\n据悉，${p}。相关负责人表示，此次调整旨在提升整体体验，后续将持续迭代优化。\n\n即日起，用户可通过官方渠道了解详情并参与。`
  }
  return `${head}\n\n${p}\n\n【要点展开】\n围绕上述主题，建议从背景、方案、收益三个层面展开；语气保持${toneLabel}，面向${audienceLabel}。`
}

/* ---------- 智能翻译（结构化演示译文） ---------- */
function translateText(text: string, target: string, terminology: string): string {
  const lines = (text || '').split('\n').filter((l) => l.trim())
  const terms = (terminology || '')
    .split(/[,，]/)
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 5)
    .map((t) => {
      const [src, dst] = t.split(/[=＝]/)
      return `- ${(src || t).trim()} → ${(dst || src || t).trim()}`
    })

  return [
    `【${target} 译文】`,
    ...lines.map((l, i) => `${i + 1}. ${l}`),
    '',
    '【回译校验】原文语义完整保留，术语按目标语言习惯处理（Mock 预览：未接入真实翻译模型时展示结构化演示译文）。',
    terms.length ? `【术语表】\n${terms.join('\n')}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

/* ---------- 用量统计（由 records + feedbacks 实时聚合） ---------- */
function buildUsage() {
  const totalTokens = records.reduce((s, r) => s + r.totalTokens, 0)
  const mockedCalls = records.filter((r) => r.mocked === 1).length
  const avgElapsed = records.length ? Math.round(records.reduce((s, r) => s + r.elapsed, 0) / records.length) : 0

  const todayStr = now().slice(0, 10)
  const todayCalls = records.filter((r) => r.createdAt.startsWith(todayStr)).length

  // 情绪分布
  const sentiMap = new Map<string, { cnt: number; sum: number }>()
  for (const f of feedbacks) {
    if (!f.sentiment) continue
    const cur = sentiMap.get(f.sentiment) ?? { cnt: 0, sum: 0 }
    cur.cnt += 1
    cur.sum += f.score
    sentiMap.set(f.sentiment, cur)
  }
  const sentiment = ['negative', 'neutral', 'positive']
    .filter((k) => sentiMap.has(k))
    .map((k) => ({
      sentiment: k,
      cnt: sentiMap.get(k)!.cnt,
      avgScore: Math.round((sentiMap.get(k)!.sum / sentiMap.get(k)!.cnt) * 1000) / 1000,
    }))

  // 风险分布
  const riskMap = new Map<string, number>()
  for (const f of feedbacks) {
    if (!f.riskLevel) continue
    riskMap.set(f.riskLevel, (riskMap.get(f.riskLevel) ?? 0) + 1)
  }
  const risk = ['high', 'medium', 'low']
    .filter((k) => riskMap.has(k))
    .map((k) => ({ riskLevel: k, cnt: riskMap.get(k)! }))

  // 来源分布
  const srcMap = new Map<string, { cnt: number; negative: number; sum: number }>()
  for (const f of feedbacks) {
    if (!f.source) continue
    const cur = srcMap.get(f.source) ?? { cnt: 0, negative: 0, sum: 0 }
    cur.cnt += 1
    if (f.sentiment === 'negative') cur.negative += 1
    cur.sum += f.score
    srcMap.set(f.source, cur)
  }
  const source = [...srcMap.entries()]
    .sort((a, b) => b[1].cnt - a[1].cnt)
    .map(([source, v]) => ({ source, cnt: v.cnt, negative: v.negative, avgScore: Math.round((v.sum / v.cnt) * 1000) / 1000 }))

  // 任务分布
  const taskMap = new Map<string, { cnt: number; totalTokens: number; elapsed: number }>()
  for (const r of records) {
    const cur = taskMap.get(r.task) ?? { cnt: 0, totalTokens: 0, elapsed: 0 }
    cur.cnt += 1
    cur.totalTokens += r.totalTokens
    cur.elapsed += r.elapsed
    taskMap.set(r.task, cur)
  }
  const task = [...taskMap.entries()].map(([task, v]) => ({
    task,
    cnt: v.cnt,
    totalTokens: v.totalTokens,
    avgElapsed: Math.round(v.elapsed / v.cnt),
  }))

  // 近 7 天趋势
  const daily: { date: string; cnt: number; totalTokens: number; elapsed: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const day = daysAgo(i).slice(0, 10)
    const rows = records.filter((r) => r.createdAt.startsWith(day))
    daily.push({
      date: day,
      cnt: rows.length,
      totalTokens: rows.reduce((s, r) => s + r.totalTokens, 0),
      avgElapsed: rows.length ? Math.round(rows.reduce((s, r) => s + r.elapsed, 0) / rows.length) : 0,
    })
  }

  return {
    totalCalls: records.length,
    todayCalls,
    totalTokens,
    mockedCalls,
    avgElapsed,
    feedbackTotal: feedbacks.length,
    feedbackPending: feedbacks.filter((f) => !f.sentiment).length,
    highRisk: feedbacks.filter((f) => f.riskLevel === 'high' && f.handled === 0).length,
    sentiment,
    risk,
    source,
    task,
    daily,
  }
}

/* ============================================================
 * 路由
 * ============================================================ */
export default [
  // ---- 模型接入状态 ----
  { url: '/api/ai/status', method: 'get', response: () => ok(AI_STATUS) },

  // ---- 场景模板预设 ----
  {
    url: '/api/ai/presets',
    method: 'get',
    response: ({ query }: Req) => {
      const scene = query.scene
      const rows = scene ? presets.filter((p) => p.scene === scene || p.scene === 'general') : presets
      return ok(rows.slice().sort((a, b) => a.sort - b.sort))
    },
  },

  // ---- 内容生成 / 润色 / 扩写 / 续写 ----
  {
    url: '/api/ai/generate',
    method: 'post',
    response: ({ body }: Req) => {
      const task = body?.task ?? 'generate'
      const scene = body?.scene ?? 'general'
      const prompt = body?.prompt ?? ''
      const content = generateContent(task, scene, prompt, body?.tone ?? 'professional', body?.audience ?? '', body?.length ?? 'medium')
      appendRecord(task, scene, prompt, content)
      return ok({
        content,
        model: AI_STATUS.model,
        vendor: AI_STATUS.vendor,
        mocked: false,
        elapsed: 800 + Math.floor(Math.random() * 1200),
        totalTokens: estTokens(prompt) + estTokens(content),
        recordId: recordSeq,
      })
    },
  },

  // ---- 智能翻译 ----
  {
    url: '/api/ai/translate',
    method: 'post',
    response: ({ body }: Req) => {
      const text = body?.text ?? ''
      const target = body?.target ?? 'English'
      const translation = translateText(text, target, body?.terminology ?? '')
      appendRecord('translate', body?.scene ?? 'general', `[Auto→${target}] ${text}`, translation)
      return ok({
        translation,
        source: 'Auto',
        target,
        chars: text.length,
        model: AI_STATUS.model,
        vendor: AI_STATUS.vendor,
        mocked: false,
        elapsed: 700 + Math.floor(Math.random() * 900),
        totalTokens: estTokens(text) + estTokens(translation),
        recordId: recordSeq,
      })
    },
  },

  // ---- 情感分析（单条） ----
  {
    url: '/api/ai/sentiment/analyze',
    method: 'post',
    response: ({ body }: Req) => {
      const feedbackId = num(body?.feedbackId, 0)
      let content = body?.content ?? ''
      if (feedbackId > 0) {
        const f = feedbacks.find((x) => x.id === feedbackId)
        if (f) content = f.content
      }
      const v = analyze(content)
      appendRecord('sentiment', 'feedback', content, `${v.sentiment} / ${v.riskLevel} / score=${v.score}`)

      // persist：写回舆情行
      if (body?.persist && feedbackId > 0) {
        const f = feedbacks.find((x) => x.id === feedbackId)
        if (f) {
          f.sentiment = v.sentiment
          f.score = v.score
          f.confidence = v.confidence
          f.riskLevel = v.riskLevel
          f.tags = v.tags.join('、')
          f.summary = v.summary
          f.suggestion = v.suggestion
          f.analyzedAt = now()
        }
      }
      return ok({ ...v, mocked: false, model: AI_STATUS.model, vendor: AI_STATUS.vendor, elapsed: 400 + Math.floor(Math.random() * 600), feedbackId })
    },
  },

  // ---- 情感分析（批量） ----
  {
    url: '/api/ai/sentiment/bulk',
    method: 'post',
    response: ({ query }: Req) => {
      const limit = num(query.limit, 50)
      const pending = feedbacks.filter((f) => !f.sentiment).slice(0, limit)
      const results = pending.map((f) => {
        const v = analyze(f.content)
        f.sentiment = v.sentiment
        f.score = v.score
        f.confidence = v.confidence
        f.riskLevel = v.riskLevel
        f.tags = v.tags.join('、')
        f.summary = v.summary
        f.suggestion = v.suggestion
        f.analyzedAt = now()
        appendRecord('sentiment', 'feedback', f.content, `${v.sentiment} / ${v.riskLevel} / score=${v.score}`)
        return { ...v, mocked: false, model: AI_STATUS.model, vendor: AI_STATUS.vendor, elapsed: 0, feedbackId: f.id }
      })
      const alerts = results.filter((r) => r.alert).length
      return ok({
        total: pending.length,
        succeed: results.length,
        failed: 0,
        alerts,
        negative: results.filter((r) => r.sentiment === 'negative').length,
        positive: results.filter((r) => r.sentiment === 'positive').length,
        neutral: results.filter((r) => r.sentiment === 'neutral').length,
        mocked: false,
        results,
      })
    },
  },

  // ---- 高危实时预警 ----
  {
    url: '/api/ai/alerts',
    method: 'get',
    response: ({ query }: Req) => {
      const limit = num(query.limit, 20)
      const rows = feedbacks.filter((f) => f.riskLevel === 'high' && f.handled === 0).slice(0, limit)
      return ok(rows)
    },
  },

  // ---- 舆情来源列表 ----
  { url: '/api/ai/feedback/sources', method: 'get', response: () => ok([...new Set(feedbacks.map((f) => f.source))]) },

  // ---- 舆情列表（筛选 + 分页） ----
  {
    url: '/api/ai/feedback',
    method: 'get',
    response: ({ query }: Req) => {
      let rows = [...feedbacks]
      const kw = (query.keyword || '').trim().toLowerCase()
      if (kw) rows = rows.filter((f) => f.content.toLowerCase().includes(kw))
      if (query.sentiment) rows = rows.filter((f) => f.sentiment === query.sentiment)
      if (query.riskLevel) rows = rows.filter((f) => f.riskLevel === query.riskLevel)
      if (query.source) rows = rows.filter((f) => f.source === query.source)
      if (query.handled !== undefined && query.handled !== '') rows = rows.filter((f) => String(f.handled) === String(query.handled))
      return ok(paginate(rows, num(query.page, 1), num(query.perPage, 10)))
    },
  },

  // ---- 新增舆情（autoAnalyze 时立即分析） ----
  {
    url: '/api/ai/feedback',
    method: 'post',
    response: ({ body }: Req) => {
      const id = Math.max(0, ...feedbacks.map((f) => f.id)) + 1
      const v = analyze(body?.content ?? '')
      const f: Feedback = {
        id,
        content: body?.content ?? '',
        source: body?.source ?? '手动录入',
        author: body?.author ?? '匿名用户',
        rating: num(body?.rating, 3),
        product: body?.product ?? '',
        sentiment: body?.autoAnalyze ? v.sentiment : '',
        score: body?.autoAnalyze ? v.score : 0,
        confidence: body?.autoAnalyze ? v.confidence : 0,
        riskLevel: body?.autoAnalyze ? v.riskLevel : '',
        tags: body?.autoAnalyze ? v.tags.join('、') : '',
        summary: body?.autoAnalyze ? v.summary : '',
        suggestion: body?.autoAnalyze ? v.suggestion : '',
        handled: 0,
        createdAt: now(),
        analyzedAt: body?.autoAnalyze ? now() : '',
      }
      feedbacks.unshift(f)
      if (body?.autoAnalyze) {
        appendRecord('sentiment', 'feedback', f.content, `${v.sentiment} / ${v.riskLevel} / score=${v.score}`)
      }
      return ok(f)
    },
  },

  // ---- 标记已处理 ----
  {
    url: '/api/ai/feedback/:id',
    method: 'put',
    response: ({ url, body }: Req) => {
      const id = num(url.split('/').pop(), -1)
      const f = feedbacks.find((x) => x.id === id)
      if (f && body?.handled !== undefined) f.handled = num(body.handled, 0)
      return ok(null)
    },
  },

  // ---- 删除舆情 ----
  {
    url: '/api/ai/feedback/:id',
    method: 'delete',
    response: ({ url }: Req) => {
      const id = num(url.split('/').pop(), -1)
      feedbacks = feedbacks.filter((f) => f.id !== id)
      return ok(null)
    },
  },

  // ---- 用量看板 ----
  { url: '/api/ai/usage', method: 'get', response: () => ok(buildUsage()) },

  // ---- 生成记录 ----
  {
    url: '/api/ai/records',
    method: 'get',
    response: ({ query }: Req) => {
      let rows = [...records]
      if (query.task) rows = rows.filter((r) => r.task === query.task)
      return ok(paginate(rows, num(query.page, 1), num(query.perPage, 10)))
    },
  },

  // ---- 删除单条记录 ----
  {
    url: '/api/ai/records/:id',
    method: 'delete',
    response: ({ url }: Req) => {
      const id = num(url.split('/').pop(), -1)
      records = records.filter((r) => r.id !== id)
      return ok(null)
    },
  },

  // ---- 清空记录 ----
  { url: '/api/ai/records', method: 'delete', response: () => { records = []; return ok(null) } },
] as MockMethod[]
