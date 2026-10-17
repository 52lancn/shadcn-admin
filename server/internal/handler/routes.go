package handler

import (
	"net/http"

	"admin-server/internal/middleware"
	"admin-server/internal/svc"

	"github.com/zeromicro/go-zero/rest"
)

// RegisterHandlers wires up every route group on the server.
func RegisterHandlers(server *rest.Server, svcCtx *svc.ServiceContext) {
	cfg := svcCtx.Config
	authMW := middleware.JWTAuth(cfg, svcCtx)

	// ---------- PUBLIC ----------
	server.AddRoutes([]rest.Route{
		{Method: http.MethodPost, Path: "/api/auth/login", Handler: LoginHandler(svcCtx)},
	})

	// ---------- AUTHED ----------
	authed := []rest.Route{
		{Method: http.MethodGet, Path: "/api/auth/info", Handler: UserInfoHandler(svcCtx)},
		{Method: http.MethodGet, Path: "/api/auth/menus", Handler: UserMenusHandler(svcCtx)},
		{Method: http.MethodPost, Path: "/api/auth/password", Handler: ChangePasswordHandler(svcCtx)},

		// users
		{Method: http.MethodGet, Path: "/api/sys/users", Handler: UserListHandler(svcCtx)},
		{Method: http.MethodGet, Path: "/api/sys/users/:id", Handler: UserGetHandler(svcCtx)},
		{Method: http.MethodPost, Path: "/api/sys/users", Handler: UserCreateHandler(svcCtx)},
		{Method: http.MethodPut, Path: "/api/sys/users/:id", Handler: UserUpdateHandler(svcCtx)},
		{Method: http.MethodDelete, Path: "/api/sys/users/:id", Handler: UserDeleteHandler(svcCtx)},
		{Method: http.MethodPost, Path: "/api/sys/users/batch-delete", Handler: UserBatchDeleteHandler(svcCtx)},

		// roles
		{Method: http.MethodGet, Path: "/api/sys/roles", Handler: RoleListHandler(svcCtx)},
		{Method: http.MethodGet, Path: "/api/sys/roles/options", Handler: RoleOptionsHandler(svcCtx)},
		{Method: http.MethodPost, Path: "/api/sys/roles", Handler: RoleCreateHandler(svcCtx)},
		{Method: http.MethodPut, Path: "/api/sys/roles/:id", Handler: RoleUpdateHandler(svcCtx)},
		{Method: http.MethodDelete, Path: "/api/sys/roles/:id", Handler: RoleDeleteHandler(svcCtx)},
		{Method: http.MethodPost, Path: "/api/sys/roles/menus", Handler: RoleAssignMenusHandler(svcCtx)},

		// menus
		{Method: http.MethodGet, Path: "/api/sys/menus", Handler: MenuListHandler(svcCtx)},
		{Method: http.MethodGet, Path: "/api/sys/menus/:id", Handler: MenuGetHandler(svcCtx)},
		{Method: http.MethodPost, Path: "/api/sys/menus", Handler: MenuCreateHandler(svcCtx)},
		{Method: http.MethodPut, Path: "/api/sys/menus/:id", Handler: MenuUpdateHandler(svcCtx)},
		{Method: http.MethodDelete, Path: "/api/sys/menus/:id", Handler: MenuDeleteHandler(svcCtx)},

		// configs
		{Method: http.MethodGet, Path: "/api/sys/configs", Handler: ConfigListHandler(svcCtx)},
		{Method: http.MethodGet, Path: "/api/sys/configs/by-key", Handler: ConfigGetByKeyHandler(svcCtx)},
		{Method: http.MethodPost, Path: "/api/sys/configs", Handler: ConfigCreateHandler(svcCtx)},
		{Method: http.MethodPut, Path: "/api/sys/configs/:id", Handler: ConfigUpdateHandler(svcCtx)},
		{Method: http.MethodDelete, Path: "/api/sys/configs/:id", Handler: ConfigDeleteHandler(svcCtx)},

		// dicts
		{Method: http.MethodGet, Path: "/api/sys/dicts", Handler: DictListHandler(svcCtx)},
		{Method: http.MethodPost, Path: "/api/sys/dicts", Handler: DictCreateHandler(svcCtx)},
		{Method: http.MethodPut, Path: "/api/sys/dicts/:id", Handler: DictUpdateHandler(svcCtx)},
		{Method: http.MethodDelete, Path: "/api/sys/dicts/:id", Handler: DictDeleteHandler(svcCtx)},

		// dict items
		{Method: http.MethodGet, Path: "/api/sys/dicts/:dictId/items", Handler: DictItemListHandler(svcCtx)},
		{Method: http.MethodPost, Path: "/api/sys/dicts/items", Handler: DictItemSaveHandler(svcCtx)},
		{Method: http.MethodDelete, Path: "/api/sys/dicts/items/:id", Handler: DictItemDeleteHandler(svcCtx)},

		// ---- Phase 2: demo: data list (products) ----
		{Method: http.MethodGet, Path: "/api/demo/products", Handler: ProductListHandler(svcCtx)},
		{Method: http.MethodGet, Path: "/api/demo/products/stats", Handler: ProductStatsHandler(svcCtx)},
		{Method: http.MethodGet, Path: "/api/demo/products/:id", Handler: ProductGetHandler(svcCtx)},
		{Method: http.MethodPost, Path: "/api/demo/products", Handler: ProductCreateHandler(svcCtx)},
		{Method: http.MethodPut, Path: "/api/demo/products/:id", Handler: ProductUpdateHandler(svcCtx)},
		{Method: http.MethodDelete, Path: "/api/demo/products/:id", Handler: ProductDeleteHandler(svcCtx)},
		{Method: http.MethodPost, Path: "/api/demo/products/batch-delete", Handler: ProductBatchDeleteHandler(svcCtx)},

		// ---- Phase 2: demo: gallery ----
		{Method: http.MethodGet, Path: "/api/demo/gallery", Handler: GalleryListHandler(svcCtx)},
		{Method: http.MethodGet, Path: "/api/demo/gallery/categories", Handler: GalleryCategoriesHandler(svcCtx)},
		{Method: http.MethodPost, Path: "/api/demo/gallery", Handler: GalleryCreateHandler(svcCtx)},
		{Method: http.MethodPut, Path: "/api/demo/gallery/:id", Handler: GalleryUpdateHandler(svcCtx)},
		{Method: http.MethodDelete, Path: "/api/demo/gallery/:id", Handler: GalleryDeleteHandler(svcCtx)},
		{Method: http.MethodPost, Path: "/api/demo/gallery/batch-delete", Handler: GalleryBatchDeleteHandler(svcCtx)},

		// ---- Phase 2: demo: charts + monitor ----
		{Method: http.MethodGet, Path: "/api/demo/charts/overview", Handler: ChartOverviewHandler(svcCtx)},
		{Method: http.MethodGet, Path: "/api/demo/monitor/snapshot", Handler: MonitorSnapshotHandler(svcCtx)},

		// ---- AI: 智能内容与运营 ----
		// AIGC: generate / polish / expand / continue
		{Method: http.MethodPost, Path: "/api/ai/generate", Handler: AiGenerateHandler(svcCtx)},
		{Method: http.MethodGet, Path: "/api/ai/presets", Handler: AiPresetListHandler(svcCtx)},

		// translation
		{Method: http.MethodPost, Path: "/api/ai/translate", Handler: AiTranslateHandler(svcCtx)},

		// sentiment analysis + real-time alerting
		{Method: http.MethodPost, Path: "/api/ai/sentiment/analyze", Handler: AiSentimentAnalyzeHandler(svcCtx)},
		{Method: http.MethodPost, Path: "/api/ai/sentiment/bulk", Handler: AiSentimentBulkHandler(svcCtx)},

		// feedback console (the sentiment data source)
		{Method: http.MethodGet, Path: "/api/ai/feedback", Handler: AiFeedbackListHandler(svcCtx)},
		{Method: http.MethodPost, Path: "/api/ai/feedback", Handler: AiFeedbackCreateHandler(svcCtx)},
		{Method: http.MethodPut, Path: "/api/ai/feedback/:id", Handler: AiFeedbackUpdateHandler(svcCtx)},
		{Method: http.MethodDelete, Path: "/api/ai/feedback/:id", Handler: AiFeedbackDeleteHandler(svcCtx)},
		{Method: http.MethodGet, Path: "/api/ai/feedback/sources", Handler: AiFeedbackSourcesHandler(svcCtx)},
		{Method: http.MethodGet, Path: "/api/ai/alerts", Handler: AiAlertListHandler(svcCtx)},

		// usage dashboard + history
		{Method: http.MethodGet, Path: "/api/ai/usage", Handler: AiUsageHandler(svcCtx)},
		{Method: http.MethodGet, Path: "/api/ai/records", Handler: AiRecordListHandler(svcCtx)},
		{Method: http.MethodDelete, Path: "/api/ai/records/:id", Handler: AiRecordDeleteHandler(svcCtx)},
		{Method: http.MethodDelete, Path: "/api/ai/records", Handler: AiRecordClearHandler(svcCtx)},
		{Method: http.MethodGet, Path: "/api/ai/status", Handler: AiStatusHandler(svcCtx)},
	}

	server.AddRoutes(rest.WithMiddleware(authMW, authed...))

	// health check
	server.AddRoute(rest.Route{Method: http.MethodGet, Path: "/api/health", Handler: func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	}})
}