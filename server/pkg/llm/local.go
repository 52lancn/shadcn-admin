package llm

import (
	"encoding/json"
	"fmt"
	"strings"
)

// LocalChat is the offline fallback engine.
//
// It exists for two reasons:
//  1. the project must be demo-able on a fresh clone with zero credentials;
//  2. an API outage should degrade the page, not take it down.
//
// It dispatches on a task marker that the logic layer always puts in the
// system prompt, so the output shape matches what the real vendor would
// return for the same prompt (including strict JSON for the sentiment task).
func LocalChat(req Request) (*Response, error) {
	if len(req.Messages) == 0 {
		return nil, fmt.Errorf("llm: empty message list")
	}
	system := ""
	user := ""
	for i := len(req.Messages) - 1; i >= 0; i-- {
		if req.Messages[i].Role == "user" {
			user = req.Messages[i].Content
		}
	}
	if len(req.Messages) > 0 && req.Messages[0].Role == "system" {
		system = req.Messages[0].Content
	}

	task := extractTask(system)
	in := extractSection(system, "INPUT")

	var out string
	switch task {
	case TaskSentiment:
		out = localSentiment(in, user)
	case TaskTranslate:
		out = localTranslate(system, user)
	default:
		out = localCompose(task, in, user)
	}

	return &Response{
		Content:      out,
		Model:        "local-fallback-engine",
		FinishReason: "stop",
		Vendor:       "本地兜底引擎",
		Usage: Usage{
			PromptTokens:     estimateTokens(system) + estimateTokens(user),
			CompletionTokens: estimateTokens(out),
			TotalTokens:      estimateTokens(system) + estimateTokens(user) + estimateTokens(out),
		},
	}, nil
}

// Task markers shared by the logic layer and this engine.
const (
	TaskCompose   = "compose"
	TaskTranslate = "translate"
	TaskSentiment = "sentiment"
)

// extractTask pulls the [task:xxx] marker out of the system prompt.
func extractTask(system string) string {
	lower := strings.ToLower(system)
	idx := strings.Index(lower, "[task:")
	if idx < 0 {
		return TaskCompose
	}
	rest := system[idx+len("[task:"):]
	end := strings.Index(rest, "]")
	if end < 0 {
		return TaskCompose
	}
	switch strings.TrimSpace(rest[:end]) {
	case TaskTranslate:
		return TaskTranslate
	case TaskSentiment:
		return TaskSentiment
	default:
		return TaskCompose
	}
}

// extractSection returns the body of a "## SECTION" block in the system prompt.
func extractSection(system, name string) string {
	marker := "## " + name
	idx := strings.Index(system, marker)
	if idx < 0 {
		return ""
	}
	rest := system[idx+len(marker):]
	lines := strings.Split(rest, "\n")
	var out []string
	// The text sitting on the marker line itself is part of the section body.
	if len(lines) > 0 {
		out = append(out, lines[0])
	}
	for _, ln := range lines[1:] {
		if strings.HasPrefix(strings.TrimSpace(ln), "## ") {
			break
		}
		out = append(out, ln)
	}
	return strings.TrimSpace(strings.Join(out, "\n"))
}

// estimateTokens is a rough CJK-aware token estimate (no tokenizer needed).
func estimateTokens(s string) int {
	if s == "" {
		return 0
	}
	cjk := 0
	ascii := 0
	for _, r := range s {
		if r > 0x2E80 {
			cjk++
		} else {
			ascii++
		}
	}
	return cjk + ascii/4
}

// ---------------------------------------------------------------- compose

var composeOpeners = map[string][]string{
	"product": {
		"【卖点直给】一句话说清它凭什么值得买。",
		"【场景带入】先把你放进使用场景，再给方案。",
		"【痛点开场】承认问题，再交出答案。",
	},
	"email": {
		"【主题行】短、具体、带一个具体数字或时间点。",
		"【正文】三段式：现状 → 方案 → 行动。",
		"【CTA】只保留一个动作，别让用户做选择。",
	},
	"news": {
		"【导语】先交代「发生了什么」，再交代「意味着什么」。",
		"【主体】按重要性排序，不按时间顺序。",
		"【影响面】明确写出受影响的群体。",
	},
	"polish": {
		"【精修要点】保留原意，重排语序，去掉冗词。",
		"【语气校准】把口语化表达替换为书面表达。",
		"【保留项】数字、专有名词、承诺类表述一律不动。",
	},
	"expand": {
		"【扩写方向】补充场景、细节与数据支撑。",
		"【新增层次】从「是什么」扩到「为什么」和「怎么做」。",
		"【边界控制】不新增原文没有的事实性断言。",
	},
	"continue": {
		"【衔接】承接上一句的语气与节奏，不重新起头。",
		"【推进】引入新信息点，避免原地打转。",
		"【收束】给出一个明确的落点。",
	},
}

func localCompose(task, input, user string) string {
	source := strings.TrimSpace(firstNonEmpty(input, user))
	if source == "" {
		source = "（未提供原始素材）"
	}
	var b strings.Builder

	notice := "【当前由本地兜底引擎生成 · 未配置 API Key】以下是结构化示范文案，接入模型后即为真实生成结果。\n\n"
	b.WriteString(notice)

	switch task {
	case "product":
		b.WriteString("【商品标题】\n")
		b.WriteString(fmt.Sprintf("%s｜值得放进购物车的理由，一次说清\n\n", headline(source)))
		b.WriteString("【核心卖点】\n")
		b.WriteString("1. 一句话价值：把用户最关心的问题直接回答掉，不绕弯。\n")
		b.WriteString("2. 可验证的细节：给出具体参数或使用场景，而不是形容词堆砌。\n")
		b.WriteString("3. 差异点：说清「同类里不一样的地方」，这是下单的临门一脚。\n\n")
		b.WriteString("【用户场景】\n")
		b.WriteString(fmt.Sprintf("当你正在为「%s」发愁时，它把决策成本降到最低：开箱即用，无需额外配置。\n\n", trimTo(source, 24)))
		b.WriteString("【营销短句】\n")
		b.WriteString("- 别人要折腾三步，你只要一步。\n- 不将就的选择，才是真省心。\n\n")
		b.WriteString("【行动号召】\n")
		b.WriteString("现在下单即享早鸟优惠，数量有限。")

	case "email":
		b.WriteString("【主题行备选】\n")
		b.WriteString("- 3 分钟看懂：这次更新解决了什么问题\n")
		b.WriteString("- 关于「")
		b.WriteString(trimTo(source, 20))
		b.WriteString("」，我们做了 3 个改动\n\n")
		b.WriteString("【正文】\n")
		b.WriteString("你好，\n\n")
		b.WriteString(fmt.Sprintf("先说结论：围绕「%s」，我们完成了一轮优化，重点不在功能堆叠，而在减少你的操作步骤。\n\n", trimTo(source, 24)))
		b.WriteString("具体来说：\n")
		b.WriteString("1. 首屏信息更聚焦，关键动作前置；\n")
		b.WriteString("2. 关键路径少了 2 次点击；\n")
		b.WriteString("3. 异常场景给了明确提示，不再静默失败。\n\n")
		b.WriteString("如果你愿意，抽 3 分钟试用一下，反馈直接发我邮箱即可。\n\n")
		b.WriteString("—— 产品团队")

	case "news":
		b.WriteString("【标题】\n")
		b.WriteString(fmt.Sprintf("%s：业务侧公布最新进展，服务能力同步升级\n\n", headline(source)))
		b.WriteString("【正文】\n")
		b.WriteString("【导语】\n")
		b.WriteString(fmt.Sprintf("今日，公司就「%s」相关事宜发布说明，宣布相关流程已完成调整。\n\n", trimTo(source, 24)))
		b.WriteString("【核心内容】\n")
		b.WriteString("一、本次调整覆盖全部在用渠道，存量客户无需操作。\n")
		b.WriteString("二、服务指标较上一周期提升，具体数据将在下期通报中披露。\n")
		b.WriteString("三、如遇异常，可通过官方渠道反馈，专人跟进。\n\n")
		b.WriteString("【影响与建议】\n")
		b.WriteString("建议相关业务方在下个周期开始前完成一次内部对齐。")

	case "polish":
		b.WriteString("【精修后】\n")
		b.WriteString(polishLocally(source))
		b.WriteString("\n\n【修改说明】\n")
		b.WriteString("- 删去重复的修饰成分，长句拆短；\n- 口语词替换为书面表达；\n- 关键信息前置，结论先行。")

	case "expand":
		b.WriteString("【扩写后】\n")
		b.WriteString(source)
		b.WriteString("\n\n具体来看，")
		b.WriteString(trimTo(source, 18))
		b.WriteString("之所以值得关注，在于它同时解决了三个层面的问题。\n\n")
		b.WriteString("第一，认知层面。多数人对这件事的印象停留在概念上，缺少可落地的判断标准，因此很难形成决策。\n\n")
		b.WriteString("第二，场景层面。真实的使用环境往往比演示场景复杂得多，这就要求方案本身留有调整余地，而不是把最优解写死在文档里。\n\n")
		b.WriteString("第三，成本层面。任何方案的落地都要折算成时间与人力，本方案在这两项上明显更低，这也是它更容易被接受的原因。\n\n")
		b.WriteString("综上，真正需要关注的不是它做了什么，而是它让原本复杂的流程重新变得简单。")

	case "continue":
		b.WriteString("【续写】\n")
		b.WriteString(source)
		b.WriteString("。\n\n")
		b.WriteString("沿着这条线索往下看，会发现事情并没有停在表面：一方面，变化正在以更快的速度发生；另一方面，相应的准备却还停留在原来的节奏上。\n\n")
		b.WriteString("这中间的时间差，就是真正值得关注的地方。它既是风险，也是机会——取决于接下来怎么做。\n\n")
		b.WriteString("与其等待一个确定的结果，不如先把能确定的部分做扎实。")

	default:
		b.WriteString(source)
	}

	return b.String()
}

func headline(s string) string {
	t := trimTo(s, 18)
	t = strings.TrimSpace(t)
	if t == "" {
		return "值得一看的好东西"
	}
	return t
}

func polishLocally(s string) string {
	repl := [][2]string{
		{"然后", "随后"},
		{"就是说", "即"},
		{"其实", "实则"},
		{"非常非常", "极其"},
		{"大概", "约"},
		{"我们觉得", "我们认为"},
		{" lots of ", " 大量 "},
		{"!!!", "。"},
		{"。。。", "。"},
	}
	out := s
	for _, r := range repl {
		out = strings.ReplaceAll(out, r[0], r[1])
	}
	out = strings.TrimSpace(out)
	if out != "" && !strings.HasSuffix(out, "。") && !strings.HasSuffix(out, "！") && !strings.HasSuffix(out, "？") {
		out += "。"
	}
	return out
}

// --------------------------------------------------------------- translate

func localTranslate(system, user string) string {
	target := extractSection(system, "TARGET")
	if target == "" {
		target = "English"
	}
	src := strings.TrimSpace(user)
	if src == "" {
		src = "（无内容）"
	}
	var b strings.Builder
	b.WriteString(fmt.Sprintf("【%s 译文】\n", target))
	b.WriteString(localPseudoTranslate(src, target))
	b.WriteString("\n\n【回译校验】\n")
	b.WriteString("原文语义完整保留，术语按目标语言习惯处理；当前由本地兜底引擎输出，配置模型后即为真实译文。\n\n【术语表】\n")
	b.WriteString("- 主标题 → Headline\n- 用户体验 → User Experience\n- 交付 → Delivery\n- 复购 → Repeat Purchase")
	return b.String()
}

// localPseudoTranslate performs a deterministic, reversible "translation":
// it re-frames the source into a structured target-language layout. It is
// intentionally honest - it does not pretend to be a real translation.
func localPseudoTranslate(src, target string) string {
	lines := strings.Split(src, "\n")
	var b strings.Builder
	b.WriteString(fmt.Sprintf("Target: %s | Source length: %d chars\n\n", target, len([]rune(src))))
	for i, ln := range lines {
		trimmed := strings.TrimSpace(ln)
		if trimmed == "" {
			b.WriteString("\n")
			continue
		}
		b.WriteString(fmt.Sprintf("%d. %s\n", i+1, trimmed))
	}
	return b.String()
}

// ---------------------------------------------------------------- sentiment

// LocalSentimentResult mirrors the JSON the vendor must return for the
// sentiment task. Kept here so both engines agree on the contract.
type LocalSentimentResult struct {
	Sentiment  string   `json:"sentiment"`
	Score      float64  `json:"score"`
	Confidence float64  `json:"confidence"`
	RiskLevel  string   `json:"riskLevel"`
	Tags       []string `json:"tags"`
	Summary    string   `json:"summary"`
	Suggestion string   `json:"suggestion"`
}

var positiveWords = []string{
	"好", "棒", "赞", "喜欢", "满意", "推荐", "不错", "优秀", "舒服", "惊喜",
	"值", "划算", "快", "及时", "专业", "耐心", "细心", "great", "good", "love", "perfect",
}

var negativeWords = []string{
	"差", "烂", "失望", "垃圾", "骗", "退款", "投诉", "举报", "差评", "慢", "贵",
	"破损", "坏了", "退货", "恶心", "无语", "骗人", "terrible", "awful", "bad", "refund",
}

var urgentWords = []string{"投诉", "举报", "起诉", "曝光", "315", "消协", "维权", "曝光", "媒体"}

func localSentiment(input, user string) string {
	text := strings.TrimSpace(firstNonEmpty(input, user))
	res := LocalSentimentResult{
		Sentiment:  "neutral",
		Score:      0,
		Confidence: 0.6,
		RiskLevel:  "low",
		Tags:       []string{},
	}
	if text == "" {
		res.Summary = "无内容"
		res.Suggestion = "内容为空，无需处理。"
		out, _ := json.Marshal(res)
		return string(out)
	}

	pos, neg, urgent := 0, 0, 0
	lower := strings.ToLower(text)
	for _, w := range positiveWords {
		pos += strings.Count(lower, strings.ToLower(w))
	}
	for _, w := range negativeWords {
		neg += strings.Count(lower, strings.ToLower(w))
	}
	for _, w := range urgentWords {
		if strings.Contains(text, w) {
			urgent++
		}
	}

	switch {
	case neg > 0 && neg >= pos:
		res.Sentiment = "negative"
		res.Score = clamp(float64(-neg)*0.25 + float64(pos)*0.1, -1, 0)
	case pos > 0:
		res.Sentiment = "positive"
		res.Score = clamp(float64(pos)*0.2 - float64(neg)*0.15, 0, 1)
	}
	if res.Score == 0 && res.Sentiment == "neutral" {
		res.Score = 0
	}

	switch {
	case urgent > 0:
		res.RiskLevel = "high"
	case res.Sentiment == "negative" && neg >= 2:
		res.RiskLevel = "medium"
	case res.Sentiment == "negative":
		res.RiskLevel = "medium"
	default:
		res.RiskLevel = "low"
	}

	var tags []string
	if neg > 0 {
		tags = append(tags, "负面词命中")
	}
	if pos > 0 {
		tags = append(tags, "正面词命中")
	}
	if urgent > 0 {
		tags = append(tags, "高危词命中")
	}
	if len(tags) == 0 {
		tags = append(tags, "无明显情绪词")
	}
	res.Tags = tags
	res.Confidence = 0.72
	res.Summary = fmt.Sprintf("命中正面词 %d 次、负面词 %d 次、高危词 %d 处，整体倾向「%s」。", pos, neg, urgent, sentimentCN(res.Sentiment))
	res.Suggestion = suggestionFor(res.Sentiment, res.RiskLevel)

	out, _ := json.Marshal(res)
	return string(out)
}

func sentimentCN(s string) string {
	switch s {
	case "positive":
		return "正向"
	case "negative":
		return "负向"
	default:
		return "中性"
	}
}

func suggestionFor(sentiment, risk string) string {
	switch {
	case risk == "high":
		return "疑似恶意投诉/维权言论，建议 30 分钟内人工介入，先致歉安抚并给出明确处理时限。"
	case sentiment == "negative":
		return "负向反馈，建议客服主动联系用户核实问题，48 小时内反馈处理结果。"
	case sentiment == "positive":
		return "正向反馈，建议邀请用户参与评价晒单或会员口碑计划。"
	default:
		return "中性内容，可归档，无需即时处理。"
	}
}

// ------------------------------------------------------------------ utils

func clamp(v, lo, hi float64) float64 {
	if v < lo {
		return lo
	}
	if v > hi {
		return hi
	}
	return v
}

func trimTo(s string, n int) string {
	r := []rune(s)
	if len(r) <= n {
		return s
	}
	return string(r[:n])
}

func firstNonEmpty(vals ...string) string {
	for _, v := range vals {
		if strings.TrimSpace(v) != "" {
			return v
		}
	}
	return ""
}
