package handler

import (
	"net/http"

	"admin-server/internal/logic/sys"
	"admin-server/internal/svc"
	"admin-server/internal/types"
	"admin-server/pkg/response"

	"github.com/zeromicro/go-zero/rest/httpx"
)

// ============================ Dict ============================

func DictListHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req types.PageReq
		if err := httpx.Parse(r, &req); err != nil {
			response.FailMsg(w, "invalid query")
			return
		}
		resp, err := sys.NewDictLogic(r.Context(), svcCtx).List(&req)
		if err != nil {
			response.Fail(w, err)
			return
		}
		response.OK(w, resp)
	}
}

func DictCreateHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req types.DictSaveReq
		if err := httpx.Parse(r, &req); err != nil {
			response.FailMsg(w, "invalid body")
			return
		}
		if err := sys.NewDictLogic(r.Context(), svcCtx).Create(&req); err != nil {
			response.Fail(w, err)
			return
		}
		response.OKMsg(w, "created")
	}
}

func DictUpdateHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req types.DictSaveReq
		if err := httpx.Parse(r, &req); err != nil {
			response.FailMsg(w, "invalid body")
			return
		}
		if err := sys.NewDictLogic(r.Context(), svcCtx).Update(&req); err != nil {
			response.Fail(w, err)
			return
		}
		response.OKMsg(w, "updated")
	}
}

func DictDeleteHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := parsePathID(r, "id")
		if err != nil {
			response.FailMsg(w, "invalid id")
			return
		}
		if err := sys.NewDictLogic(r.Context(), svcCtx).Delete(id); err != nil {
			response.Fail(w, err)
			return
		}
		response.OKMsg(w, "deleted")
	}
}

// ---- dict item ----

func DictItemListHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		dictID, err := parsePathID(r, "dictId")
		if err != nil {
			response.FailMsg(w, "invalid dictId")
			return
		}
		resp, err := sys.NewDictLogic(r.Context(), svcCtx).ListItems(dictID)
		if err != nil {
			response.Fail(w, err)
			return
		}
		response.OK(w, resp)
	}
}

func DictItemSaveHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req types.DictItemSaveReq
		if err := httpx.Parse(r, &req); err != nil {
			response.FailMsg(w, "invalid body")
			return
		}
		l := sys.NewDictLogic(r.Context(), svcCtx)
		var err error
		if req.ID == 0 {
			err = l.CreateItem(&req)
		} else {
			err = l.UpdateItem(&req)
		}
		if err != nil {
			response.Fail(w, err)
			return
		}
		response.OKMsg(w, "saved")
	}
}

func DictItemDeleteHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := parsePathID(r, "id")
		if err != nil {
			response.FailMsg(w, "invalid id")
			return
		}
		if err := sys.NewDictLogic(r.Context(), svcCtx).DeleteItem(id); err != nil {
			response.Fail(w, err)
			return
		}
		response.OKMsg(w, "deleted")
	}
}