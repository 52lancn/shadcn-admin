// Package ai implements the AI content & operations module:
// AIGC copy generation, multi-language translation, sentiment analysis and
// real-time alerting for hostile complaints.
package ai

import (
	"context"
	"fmt"
	"strings"
	"time"

	"admin-server/internal/svc"
	"admin-server/pkg/ctxx"
	"admin-server/pkg/llm"

	"github.com/zeromicro/go-zero/core/logx"
)

// BaseLogic carries the shared plumbing every AI logic struct needs.
type BaseLogic struct {
	ctx    context.Context
	svcCtx *svc.ServiceContext
	logx.Logger
}

func newBase(ctx context.Context, svcCtx *svc.ServiceContext) BaseLogic {
	return BaseLogic{ctx: ctx, svcCtx: svcCtx, Logger: logx.WithContext(ctx)}
}

// chat is the single funnel through which every AI call in this module goes.
// Centralising it means timeout, model override and token accounting are
// handled identically no matter which feature called the model.
func (b *BaseLogic) chat(model string, msgs []llm.Message) (*llm.Response, error) {
	cfg := b.svcCtx.Config.AI
	temp := cfg.Temperature
	if temp <= 0 {
		temp = 0.7
	}
	maxTokens := cfg.MaxTokens
	if maxTokens <= 0 {
		maxTokens = 2048
	}
	return b.svcCtx.LLM.Chat(b.ctx, llm.Request{
		Messages:    msgs,
		Model:       model,
		Temperature: temp,
		MaxTokens:   maxTokens,
	})
}

// temperatureFor lets a caller pick a deterministic temperature for
// structured-output tasks (sentiment parsing) vs. creative tasks (copywriting).
func (b *BaseLogic) temperatureFor(task string) float64 {
	if task == "sentiment" || task == "translate" {
		return 0.2
	}
	cfg := b.svcCtx.Config.AI.Temperature
	if cfg <= 0 {
		return 0.7
	}
	return cfg
}

// buildPrompt assembles the system prompt for a copywriting task.
// The [task:xxx] / ## SECTION layout is also what the local fallback engine
// parses, so both engines stay in lock-step.
func buildPrompt(task, scene, tone, audience, length, userInput string) string {
	var b strings.Builder

	role := "你是一名资深的中文营销文案专家，擅长撰写有转化力的商业文案。"
	switch scene {
	case "product":
		role = "你是一名资深电商文案策划，擅长把商品卖点写成有购买理由的文案。"
	case "email":
		role = "你是一名资深的 EDM 邮件营销专家，擅长写出高打开率、高点击率的邮件。"
	case "news":
		role = "你是一名企业品牌公关撰稿人，擅长写客观、严谨、不夸大的公告类文本。"
	}

	b.WriteString(role)
	b.WriteString(fmt.Sprintf("\n[task:%s]", task))

	if tone != "" && tone != "default" {
		b.WriteString(fmt.Sprintf("\n\n## TONE\n%s", toneCN(tone)))
	}
	if audience != "" {
		b.WriteString(fmt.Sprintf("\n\n## AUDIENCE\n目标受众：%s", audience))
	}
	if length != "" && length != "default" {
		b.WriteString(fmt.Sprintf("\n\n## LENGTH\n篇幅要求：%s", lengthCN(length)))
	}
	if task == "generate" {
		b.WriteString("\n\n## RULES\n1. 直接输出成品文案，不要写解释、不要用「好的」「以下是」等开场白。\n" +
			"2. 使用短句和具体名词，避免「极致」「赋能」「闭环」这类空泛词。\n" +
			"3. 结构清晰，关键信息前置。\n" +
			"4. 严格遵循篇幅要求。\n" +
			"5. 使用简体中文。")
	} else {
		b.WriteString("\n\n## RULES\n1. 保留原文的核心信息与所有数字/专有名词，不得改变事实。\n" +
			"2. 直接输出结果，不要解释你做了什么。\n" +
			"3. 使用简体中文。")
	}

	b.WriteString(fmt.Sprintf("\n\n## INPUT\n%s", userInput))
	return b.String()
}

func toneCN(t string) string {
	switch t {
	case "professional":
		return "专业严谨，适合 B 端与官方渠道"
	case "friendly":
		return "亲切自然，像朋友推荐"
	case "energetic":
		return "有感染力和促销感，节奏明快"
	case "concise":
		return "极简克制，不铺陈，直给结论"
	case "formal":
		return "正式书面，适合公告与对外发布"
	default:
		return "自然、专业、易读"
	}
}

func lengthCN(l string) string {
	switch l {
	case "short":
		return "100 字以内"
	case "medium":
		return "200-300 字"
	case "long":
		return "500 字以上，可分小段"
	default:
		return "适中"
	}
}

// nowISO is the timestamp format used across every AI VO.
func nowISO(t time.Time) string { return t.Format("2006-01-02 15:04:05") }

// uid returns the authenticated user id, or 0 when the call is anonymous.
func (b *BaseLogic) uid() int64 { return ctxx.UID(b.ctx) }

// recordOpts holds the knobs shared by record() implementations.
func (b *BaseLogic) recordEnabled() bool { return b.svcCtx.Config.AI.Record }
