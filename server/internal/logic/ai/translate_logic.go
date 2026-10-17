package ai

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"admin-server/internal/model"
	"admin-server/internal/svc"
	"admin-server/internal/types"
	"admin-server/pkg/llm"
)

// TranslateLogic powers the one-click multi-language translation.
type TranslateLogic struct {
	GenerateLogic
}

func NewTranslateLogic(ctx context.Context, svcCtx *svc.ServiceContext) *TranslateLogic {
	return &TranslateLogic{GenerateLogic{BaseLogic: newBase(ctx, svcCtx)}}
}

// maxTranslateChars bounds a single request. Chunks beyond this are split and
// translated separately so one huge paste cannot blow the context window.
const maxTranslateChars = 6000

func (l *TranslateLogic) Translate(req *types.AiTranslateReq) (*types.AiTranslateResp, error) {
	text := strings.TrimSpace(req.Text)
	if text == "" {
		return nil, errors.New("text is required")
	}
	if len([]rune(text)) > maxTranslateChars*3 {
		return nil, fmt.Errorf("text too long: max %d characters per request", maxTranslateChars*3)
	}

	target := strings.TrimSpace(req.Target)
	if target == "" {
		target = "English"
	}
	source := strings.TrimSpace(req.Source)
	if source == "" {
		source = "Auto"
	}
	scene := strings.TrimSpace(req.Scene)
	if scene == "" {
		scene = "general"
	}

	var system strings.Builder
	system.WriteString("你是一名专业的多语言翻译与本地化专家，熟悉目标语言在商业场景下的表达习惯。\n")
	system.WriteString("[task:translate]")
	system.WriteString(fmt.Sprintf("\n\n## TARGET\n%s", target))
	system.WriteString(fmt.Sprintf("\n\n## SOURCE\n%s", source))
	if t := strings.TrimSpace(req.Terminology); t != "" {
		system.WriteString(fmt.Sprintf("\n\n## TERMINOLOGY\n必须严格遵循以下术语对照：\n%s", t))
	}
	if scene != "general" {
		system.WriteString(fmt.Sprintf("\n\n## SCENE\n场景：%s，保持该场景的行文风格（如邮件保持称呼与敬语、商品文案保持促销语气）", sceneCN(scene)))
	}
	system.WriteString("\n\n## RULES\n" +
		"1. 只输出译文正文，不要输出原文、不要加解释、不要用代码块包裹。\n" +
		"2. 保持原文的段落结构与换行。\n" +
		"3. 采用目标语言的自然表达，避免逐字直译。\n" +
		"4. 数字、金额、单位、专有名词按目标语言惯例处理。")

	// Chunk long input so each model call stays well within its window.
	chunks := splitChunks(text, maxTranslateChars)
	parts := make([]string, 0, len(chunks))
	totalTokens := 0
	var (
		lastModel  string
		lastVendor string
		mocked     bool
		elapsed    int64
	)
	for i, chunk := range chunks {
		// Later chunks get a short lead-in so the model keeps continuity
		// instead of restarting the register on each piece.
		userMsg := chunk
		if i > 0 {
			userMsg = "（接上一段）" + chunk
		}
		resp, err := l.chat(req.Model, []llm.Message{
			{Role: "system", Content: system.String()},
			{Role: "user", Content: userMsg},
		})
		if err != nil {
			return nil, err
		}
		parts = append(parts, strings.TrimSpace(resp.Content))
		totalTokens += resp.Usage.TotalTokens
		lastModel, lastVendor, mocked = resp.Model, resp.Vendor, resp.Mocked
		elapsed += resp.Elapsed
	}

	translation := strings.Join(parts, "\n\n")
	recordID := l.record(&model.AiChatRecord{
		Task:             types.AiTaskTrans,
		Scene:            scene,
		Model:            lastModel,
		Vendor:           lastVendor,
		CompletionTokens: totalTokens,
		TotalTokens:      totalTokens,
		Elapsed:          int(elapsed),
		Mocked:           boolToInt(mocked),
		Input:            fmt.Sprintf("[%s→%s] %s", source, target, text),
		Output:           translation,
		UserID:           l.uid(),
	})

	return &types.AiTranslateResp{
		Translation: translation,
		Source:      source,
		Target:      target,
		Chars:       len([]rune(text)),
		Model:       lastModel,
		Vendor:      lastVendor,
		Mocked:      mocked,
		Elapsed:     elapsed,
		TotalTokens: totalTokens,
		RecordID:    recordID,
	}, nil
}

func sceneCN(s string) string {
	switch s {
	case "product":
		return "电商商品文案"
	case "email":
		return "邮件"
	case "news":
		return "公告 / 新闻稿"
	default:
		return "通用"
	}
}

// splitChunks cuts text on paragraph boundaries, hard-splitting any single
// paragraph that is longer than the limit so we never emit an empty chunk.
func splitChunks(text string, limit int) []string {
	runes := []rune(text)
	if len(runes) <= limit {
		return []string{text}
	}
	var out []string
	var cur []rune
	flush := func() {
		if len(cur) > 0 {
			out = append(out, strings.TrimSpace(string(cur)))
			cur = nil
		}
	}
	for _, ln := range strings.Split(text, "\n") {
		l := []rune(ln)
		if len(cur)+len(l)+1 > limit {
			flush()
		}
		if len(l) > limit {
			// oversized single line: slice it
			for i := 0; i < len(l); i += limit {
				end := i + limit
				if end > len(l) {
					end = len(l)
				}
				out = append(out, strings.TrimSpace(string(l[i:end])))
			}
			continue
		}
		if len(cur) > 0 {
			cur = append(cur, '\n')
		}
		cur = append(cur, l...)
	}
	flush()
	if len(out) == 0 {
		return []string{text}
	}
	return out
}
