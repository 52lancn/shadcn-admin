package ai

import (
	"context"
	"errors"
	"strings"

	"admin-server/internal/model"
	"admin-server/internal/svc"
	"admin-server/internal/types"
	"admin-server/pkg/ctxx"
	"admin-server/pkg/llm"
)

// GenerateLogic powers AIGC copy: one-shot generation plus the three
// rewrite modes (polish / expand / continue).
type GenerateLogic struct {
	BaseLogic
}

func NewGenerateLogic(ctx context.Context, svcCtx *svc.ServiceContext) *GenerateLogic {
	return &GenerateLogic{BaseLogic: newBase(ctx, svcCtx)}
}

var validTasks = map[string]bool{
	types.AiTaskGenerate: true,
	types.AiTaskPolish:   true,
	types.AiTaskExpand:   true,
	types.AiTaskContinue: true,
}

func (l *GenerateLogic) Generate(req *types.AiGenerateReq) (*types.AiGenerateResp, error) {
	task := strings.TrimSpace(req.Task)
	if task == "" {
		task = types.AiTaskGenerate
	}
	if !validTasks[task] {
		return nil, errors.New("task must be one of generate / polish / expand / continue")
	}

	scene := strings.TrimSpace(req.Scene)
	if scene == "" {
		scene = "general"
	}

	prompt := strings.TrimSpace(req.Prompt)
	// A preset fills the prompt when the caller did not type one.
	if prompt == "" && req.PresetID > 0 {
		presets, err := model.ListPromptPresets(l.ctx, l.svcCtx.DB, scene)
		if err != nil {
			return nil, err
		}
		for _, p := range presets {
			if p.ID == req.PresetID {
				prompt = p.Template
				break
			}
		}
	}
	if prompt == "" {
		return nil, errors.New("prompt is required")
	}

	system := buildPrompt(task, scene, req.Tone, req.Audience, req.Length, prompt)
	resp, err := l.chat(req.Model, []llm.Message{
		{Role: "system", Content: system},
		{Role: "user", Content: prompt},
	})
	if err != nil {
		return nil, err
	}
	out := strings.TrimSpace(resp.Content)
	if out == "" {
		return nil, errors.New("model returned empty content")
	}

	recordID := l.record(&model.AiChatRecord{
		Task:             task,
		Scene:            scene,
		Model:            resp.Model,
		Vendor:           resp.Vendor,
		PromptTokens:     resp.Usage.PromptTokens,
		CompletionTokens: resp.Usage.CompletionTokens,
		TotalTokens:      resp.Usage.TotalTokens,
		Elapsed:          int(resp.Elapsed),
		Mocked:           boolToInt(resp.Mocked),
		Input:            prompt,
		Output:           out,
		UserID:           ctxx.UID(l.ctx),
	})

	return &types.AiGenerateResp{
		Content:     out,
		Model:       resp.Model,
		Vendor:      resp.Vendor,
		Mocked:      resp.Mocked,
		Elapsed:     resp.Elapsed,
		TotalTokens: resp.Usage.TotalTokens,
		RecordID:    recordID,
	}, nil
}

// record persists one invocation when AI.Record is on. Persistence failures
// are logged but never surfaced: losing a history row must not lose the answer
// the user is already looking at.
func (l *GenerateLogic) record(r *model.AiChatRecord) int64 {
	if !l.svcCtx.Config.AI.Record {
		return 0
	}
	id, err := model.CreateChatRecord(l.ctx, l.svcCtx.DB, r)
	if err != nil {
		l.Errorf("ai: persist chat record failed: %v", err)
		return 0
	}
	return id
}

func boolToInt(b bool) int {
	if b {
		return 1
	}
	return 0
}

// Presets lists the saved prompt templates for a scene.
func (l *GenerateLogic) Presets(scene string) ([]*types.AiPresetVO, error) {
	list, err := model.ListPromptPresets(l.ctx, l.svcCtx.DB, scene)
	if err != nil {
		return nil, err
	}
	out := make([]*types.AiPresetVO, 0, len(list))
	for _, p := range list {
		out = append(out, &types.AiPresetVO{
			ID:       p.ID,
			Name:     p.Name,
			Scene:    p.Scene,
			Template: p.Template,
			Sort:     p.Sort,
			Status:   p.Status,
		})
	}
	return out, nil
}
