package handler

import (
	"net/http"
	"strconv"

	"admin-server/internal/logic/ai"
	"admin-server/internal/svc"
	"admin-server/internal/types"
	"admin-server/pkg/response"

	"github.com/zeromicro/go-zero/rest/httpx"
)

// ============================ AI: AIGC content ============================

func AiGenerateHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req types.AiGenerateReq
		if err := httpx.Parse(r, &req); err != nil {
			response.FailMsg(w, "invalid body: "+err.Error())
			return
		}
		resp, err := ai.NewGenerateLogic(r.Context(), svcCtx).Generate(&req)
		if err != nil {
			response.Fail(w, err)
			return
		}
		response.OK(w, resp)
	}
}

func AiPresetListHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		scene := r.URL.Query().Get("scene")
		resp, err := ai.NewGenerateLogic(r.Context(), svcCtx).Presets(scene)
		if err != nil {
			response.Fail(w, err)
			return
		}
		response.OK(w, resp)
	}
}

// ============================ AI: translation ============================

func AiTranslateHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req types.AiTranslateReq
		if err := httpx.Parse(r, &req); err != nil {
			response.FailMsg(w, "invalid body: "+err.Error())
			return
		}
		resp, err := ai.NewTranslateLogic(r.Context(), svcCtx).Translate(&req)
		if err != nil {
			response.Fail(w, err)
			return
		}
		response.OK(w, resp)
	}
}

// ============================ AI: sentiment ============================

func AiSentimentAnalyzeHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req types.AiSentimentAnalyzeReq
		if err := httpx.Parse(r, &req); err != nil {
			response.FailMsg(w, "invalid body: "+err.Error())
			return
		}
		resp, err := ai.NewSentimentLogic(r.Context(), svcCtx).Analyze(&req)
		if err != nil {
			response.Fail(w, err)
			return
		}
		response.OK(w, resp)
	}
}

func AiSentimentBulkHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		limit := 50
		if v := r.URL.Query().Get("limit"); v != "" {
			if n, err := strconv.Atoi(v); err == nil && n > 0 {
				limit = n
			}
		}
		resp, err := ai.NewSentimentLogic(r.Context(), svcCtx).BulkAnalyze(limit)
		if err != nil {
			response.Fail(w, err)
			return
		}
		response.OK(w, resp)
	}
}

// ============================ AI: feedback console ============================

func AiFeedbackListHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req types.AiFeedbackListReq
		if err := httpx.Parse(r, &req); err != nil {
			response.FailMsg(w, "invalid query")
			return
		}
		resp, err := ai.NewFeedbackLogic(r.Context(), svcCtx).List(&req)
		if err != nil {
			response.Fail(w, err)
			return
		}
		response.OK(w, resp)
	}
}

func AiFeedbackCreateHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req types.AiFeedbackCreateReq
		if err := httpx.Parse(r, &req); err != nil {
			response.FailMsg(w, "invalid body: "+err.Error())
			return
		}
		resp, err := ai.NewFeedbackLogic(r.Context(), svcCtx).Create(&req)
		if err != nil {
			response.Fail(w, err)
			return
		}
		response.OK(w, resp)
	}
}

func AiFeedbackUpdateHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := parsePathID(r, "id")
		if err != nil {
			response.FailMsg(w, "invalid id")
			return
		}
		var req types.AiFeedbackUpdateReq
		if err := httpx.Parse(r, &req); err != nil {
			response.FailMsg(w, "invalid body: "+err.Error())
			return
		}
		if req.Handled == nil {
			response.FailMsg(w, "handled is required")
			return
		}
		if err := ai.NewFeedbackLogic(r.Context(), svcCtx).UpdateHandled(id, *req.Handled); err != nil {
			response.Fail(w, err)
			return
		}
		response.OKMsg(w, "updated")
	}
}

func AiFeedbackDeleteHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := parsePathID(r, "id")
		if err != nil {
			response.FailMsg(w, "invalid id")
			return
		}
		if err := ai.NewFeedbackLogic(r.Context(), svcCtx).Delete(id); err != nil {
			response.Fail(w, err)
			return
		}
		response.OKMsg(w, "deleted")
	}
}

func AiAlertListHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		limit := 20
		if v := r.URL.Query().Get("limit"); v != "" {
			if n, err := strconv.Atoi(v); err == nil && n > 0 {
				limit = n
			}
		}
		resp, err := ai.NewFeedbackLogic(r.Context(), svcCtx).Alerts(limit)
		if err != nil {
			response.Fail(w, err)
			return
		}
		response.OK(w, resp)
	}
}

func AiFeedbackSourcesHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		resp, err := ai.NewFeedbackLogic(r.Context(), svcCtx).Sources()
		if err != nil {
			response.Fail(w, err)
			return
		}
		response.OK(w, resp)
	}
}

// ============================ AI: usage dashboard ============================

func AiUsageHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		days := 30
		if v := r.URL.Query().Get("days"); v != "" {
			if n, err := strconv.Atoi(v); err == nil && n > 0 {
				days = n
			}
		}
		resp, err := ai.NewUsageLogic(r.Context(), svcCtx).Usage(days)
		if err != nil {
			response.Fail(w, err)
			return
		}
		response.OK(w, resp)
	}
}

func AiRecordListHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req types.AiRecordListReq
		if err := httpx.Parse(r, &req); err != nil {
			response.FailMsg(w, "invalid query")
			return
		}
		resp, err := ai.NewUsageLogic(r.Context(), svcCtx).Records(&req)
		if err != nil {
			response.Fail(w, err)
			return
		}
		response.OK(w, resp)
	}
}

func AiRecordDeleteHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := parsePathID(r, "id")
		if err != nil {
			response.FailMsg(w, "invalid id")
			return
		}
		if err := ai.NewUsageLogic(r.Context(), svcCtx).DeleteRecord(id); err != nil {
			response.Fail(w, err)
			return
		}
		response.OKMsg(w, "deleted")
	}
}

func AiRecordClearHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if err := ai.NewUsageLogic(r.Context(), svcCtx).ClearRecords(); err != nil {
			response.Fail(w, err)
			return
		}
		response.OKMsg(w, "cleared")
	}
}

func AiStatusHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		response.OK(w, ai.NewUsageLogic(r.Context(), svcCtx).Status())
	}
}
