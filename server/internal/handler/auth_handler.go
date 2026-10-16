package handler

import (
	"net/http"

	"admin-server/internal/logic/auth"
	"admin-server/internal/svc"
	"admin-server/internal/types"
	"admin-server/pkg/response"

	"github.com/zeromicro/go-zero/rest/httpx"
)

func LoginHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req types.LoginReq
		if err := httpx.Parse(r, &req); err != nil {
			response.FailMsg(w, "invalid request body: "+err.Error())
			return
		}
		resp, err := auth.NewLoginLogic(r.Context(), svcCtx).Login(&req)
		if err != nil {
			response.Fail(w, err)
			return
		}
		response.OK(w, resp)
	}
}

func UserInfoHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		resp, err := auth.NewUserInfoLogic(r.Context(), svcCtx).UserInfo()
		if err != nil {
			response.Fail(w, err)
			return
		}
		response.OK(w, resp)
	}
}

func UserMenusHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		resp, err := auth.NewUserMenuLogic(r.Context(), svcCtx).UserMenus()
		if err != nil {
			response.Fail(w, err)
			return
		}
		response.OK(w, resp)
	}
}

func ChangePasswordHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req types.ChangePasswordReq
		if err := httpx.Parse(r, &req); err != nil {
			response.FailMsg(w, "invalid request body: "+err.Error())
			return
		}
		if err := auth.NewChangePasswordLogic(r.Context(), svcCtx).ChangePassword(&req); err != nil {
			response.Fail(w, err)
			return
		}
		response.OKMsg(w, "password updated")
	}
}