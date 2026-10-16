package handler

import (
	"net/http"

	"admin-server/internal/logic/sys"
	"admin-server/internal/svc"
	"admin-server/internal/types"
	"admin-server/pkg/response"

	"github.com/zeromicro/go-zero/rest/httpx"
)

// ============================ Config ============================

func ConfigListHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req types.PageReq
		if err := httpx.Parse(r, &req); err != nil {
			response.FailMsg(w, "invalid query")
			return
		}
		resp, err := sys.NewConfigLogic(r.Context(), svcCtx).List(&req)
		if err != nil {
			response.Fail(w, err)
			return
		}
		response.OK(w, resp)
	}
}

func ConfigGetByKeyHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		key := r.URL.Query().Get("key")
		if key == "" {
			response.FailMsg(w, "key is required")
			return
		}
		resp, err := sys.NewConfigLogic(r.Context(), svcCtx).Get(key)
		if err != nil {
			response.Fail(w, err)
			return
		}
		response.OK(w, resp)
	}
}

func ConfigCreateHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req types.ConfigSaveReq
		if err := httpx.Parse(r, &req); err != nil {
			response.FailMsg(w, "invalid body")
			return
		}
		if err := sys.NewConfigLogic(r.Context(), svcCtx).Create(&req); err != nil {
			response.Fail(w, err)
			return
		}
		response.OKMsg(w, "created")
	}
}

func ConfigUpdateHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req types.ConfigSaveReq
		if err := httpx.Parse(r, &req); err != nil {
			response.FailMsg(w, "invalid body")
			return
		}
		if err := sys.NewConfigLogic(r.Context(), svcCtx).Update(&req); err != nil {
			response.Fail(w, err)
			return
		}
		response.OKMsg(w, "updated")
	}
}

func ConfigDeleteHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := parsePathID(r, "id")
		if err != nil {
			response.FailMsg(w, "invalid id")
			return
		}
		if err := sys.NewConfigLogic(r.Context(), svcCtx).Delete(id); err != nil {
			response.Fail(w, err)
			return
		}
		response.OKMsg(w, "deleted")
	}
}