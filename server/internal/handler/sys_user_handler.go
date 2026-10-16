package handler

import (
	"net/http"
	"strconv"

	"admin-server/internal/logic/sys"
	"admin-server/internal/svc"
	"admin-server/internal/types"
	"admin-server/pkg/response"

	"github.com/zeromicro/go-zero/rest/httpx"
	"github.com/zeromicro/go-zero/rest/pathvar"
)

// helpers to parse by-id from path
func parsePathID(r *http.Request, name string) (int64, error) {
	vars := pathvar.Vars(r)
	if vars == nil {
		return 0, strconv.ErrSyntax
	}
	return strconv.ParseInt(vars[name], 10, 64)
}

// ============================ User ============================

func UserListHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req types.PageReq
		if err := httpx.Parse(r, &req); err != nil {
			response.FailMsg(w, "invalid query: "+err.Error())
			return
		}
		resp, err := sys.NewUserLogic(r.Context(), svcCtx).List(&req)
		if err != nil {
			response.Fail(w, err)
			return
		}
		response.OK(w, resp)
	}
}

func UserGetHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := parsePathID(r, "id")
		if err != nil {
			response.FailMsg(w, "invalid id")
			return
		}
		resp, err := sys.NewUserLogic(r.Context(), svcCtx).Get(id)
		if err != nil {
			response.Fail(w, err)
			return
		}
		response.OK(w, resp)
	}
}

func UserCreateHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req types.UserSaveReq
		if err := httpx.Parse(r, &req); err != nil {
			response.FailMsg(w, "invalid body: "+err.Error())
			return
		}
		if err := sys.NewUserLogic(r.Context(), svcCtx).Create(&req); err != nil {
			response.Fail(w, err)
			return
		}
		response.OKMsg(w, "created")
	}
}

func UserUpdateHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req types.UserSaveReq
		if err := httpx.Parse(r, &req); err != nil {
			response.FailMsg(w, "invalid body: "+err.Error())
			return
		}
		if err := sys.NewUserLogic(r.Context(), svcCtx).Update(&req); err != nil {
			response.Fail(w, err)
			return
		}
		response.OKMsg(w, "updated")
	}
}

func UserDeleteHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := parsePathID(r, "id")
		if err != nil {
			response.FailMsg(w, "invalid id")
			return
		}
		if err := sys.NewUserLogic(r.Context(), svcCtx).Delete(id); err != nil {
			response.Fail(w, err)
			return
		}
		response.OKMsg(w, "deleted")
	}
}

func UserBatchDeleteHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req types.ByIDs
		if err := httpx.ParseJsonBody(r, &req); err != nil {
			response.FailMsg(w, "invalid body: "+err.Error())
			return
		}
		if err := sys.NewUserLogic(r.Context(), svcCtx).BatchDelete(req.IDs); err != nil {
			response.Fail(w, err)
			return
		}
		response.OKMsg(w, "deleted")
	}
}