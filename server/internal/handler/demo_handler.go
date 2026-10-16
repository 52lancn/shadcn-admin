package handler

import (
	"net/http"
	"strconv"

	"admin-server/internal/logic/demo"
	"admin-server/internal/svc"
	"admin-server/internal/types"
	"admin-server/pkg/response"

	"github.com/zeromicro/go-zero/rest/httpx"
)

// ============================ Demo: product list ============================

func ProductListHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req types.ProductListReq
		if err := httpx.Parse(r, &req); err != nil {
			response.FailMsg(w, "invalid query")
			return
		}
		resp, err := demo.NewProductLogic(r.Context(), svcCtx).List(&req)
		if err != nil {
			response.Fail(w, err)
			return
		}
		response.OK(w, resp)
	}
}

func ProductGetHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := parsePathID(r, "id")
		if err != nil {
			response.FailMsg(w, "invalid id")
			return
		}
		resp, err := demo.NewProductLogic(r.Context(), svcCtx).Get(id)
		if err != nil {
			response.Fail(w, err)
			return
		}
		response.OK(w, resp)
	}
}

func ProductCreateHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req types.DemoProductSaveReq
		if err := httpx.Parse(r, &req); err != nil {
			response.FailMsg(w, "invalid body")
			return
		}
		if err := demo.NewProductLogic(r.Context(), svcCtx).Create(&req); err != nil {
			response.Fail(w, err)
			return
		}
		response.OKMsg(w, "created")
	}
}

func ProductUpdateHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req types.DemoProductSaveReq
		if err := httpx.Parse(r, &req); err != nil {
			response.FailMsg(w, "invalid body")
			return
		}
		if err := demo.NewProductLogic(r.Context(), svcCtx).Update(&req); err != nil {
			response.Fail(w, err)
			return
		}
		response.OKMsg(w, "updated")
	}
}

func ProductDeleteHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := parsePathID(r, "id")
		if err != nil {
			response.FailMsg(w, "invalid id")
			return
		}
		if err := demo.NewProductLogic(r.Context(), svcCtx).Delete(id); err != nil {
			response.Fail(w, err)
			return
		}
		response.OKMsg(w, "deleted")
	}
}

func ProductBatchDeleteHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req types.ByIDs
		if err := httpx.Parse(r, &req); err != nil {
			response.FailMsg(w, "invalid body")
			return
		}
		if err := demo.NewProductLogic(r.Context(), svcCtx).BatchDelete(req.IDs); err != nil {
			response.Fail(w, err)
			return
		}
		response.OKMsg(w, "deleted")
	}
}

func ProductStatsHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		resp, err := demo.NewProductLogic(r.Context(), svcCtx).Stats()
		if err != nil {
			response.Fail(w, err)
			return
		}
		response.OK(w, resp)
	}
}

// ============================ Demo: gallery ============================

func GalleryListHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req types.GalleryListReq
		if err := httpx.Parse(r, &req); err != nil {
			response.FailMsg(w, "invalid query")
			return
		}
		resp, err := demo.NewGalleryLogic(r.Context(), svcCtx).List(&req)
		if err != nil {
			response.Fail(w, err)
			return
		}
		response.OK(w, resp)
	}
}

func GalleryCategoriesHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		resp, err := demo.NewGalleryLogic(r.Context(), svcCtx).Categories()
		if err != nil {
			response.Fail(w, err)
			return
		}
		response.OK(w, resp)
	}
}

func GalleryCreateHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req types.DemoGallerySaveReq
		if err := httpx.Parse(r, &req); err != nil {
			response.FailMsg(w, "invalid body")
			return
		}
		if err := demo.NewGalleryLogic(r.Context(), svcCtx).Create(&req); err != nil {
			response.Fail(w, err)
			return
		}
		response.OKMsg(w, "created")
	}
}

func GalleryUpdateHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req types.DemoGallerySaveReq
		if err := httpx.Parse(r, &req); err != nil {
			response.FailMsg(w, "invalid body")
			return
		}
		if err := demo.NewGalleryLogic(r.Context(), svcCtx).Update(&req); err != nil {
			response.Fail(w, err)
			return
		}
		response.OKMsg(w, "updated")
	}
}

func GalleryDeleteHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := parsePathID(r, "id")
		if err != nil {
			response.FailMsg(w, "invalid id")
			return
		}
		if err := demo.NewGalleryLogic(r.Context(), svcCtx).Delete(id); err != nil {
			response.Fail(w, err)
			return
		}
		response.OKMsg(w, "deleted")
	}
}

func GalleryBatchDeleteHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req types.ByIDs
		if err := httpx.Parse(r, &req); err != nil {
			response.FailMsg(w, "invalid body")
			return
		}
		if err := demo.NewGalleryLogic(r.Context(), svcCtx).BatchDelete(req.IDs); err != nil {
			response.Fail(w, err)
			return
		}
		response.OKMsg(w, "deleted")
	}
}

// ============================ Demo: charts + monitor ============================

func ChartOverviewHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		days := 30
		if v := r.URL.Query().Get("days"); v != "" {
			if n, err := strconv.Atoi(v); err == nil && n > 0 {
				days = n
			}
		}
		resp, err := demo.NewChartLogic(r.Context(), svcCtx).Overview(days)
		if err != nil {
			response.Fail(w, err)
			return
		}
		response.OK(w, resp)
	}
}

func MonitorSnapshotHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		resp, err := demo.NewMonitorLogic(r.Context(), svcCtx).Snapshot()
		if err != nil {
			response.Fail(w, err)
			return
		}
		response.OK(w, resp)
	}
}
