package types

// ---- auth ----
type LoginReq struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type LoginResp struct {
	Token    string `json:"token"`
	ExpireIn int64  `json:"expireIn"`
}

type UserInfoResp struct {
	ID       int64  `json:"id"`
	Username string `json:"username"`
	Nickname string `json:"nickname"`
	Avatar   string `json:"avatar"`
	Roles    []string `json:"roles"`
	Perms    []string `json:"perms"`
}

type ChangePasswordReq struct {
	OldPassword string `json:"oldPassword"`
	NewPassword string `json:"newPassword"`
}

// ---- pagination ----
type PageReq struct {
	Page    int    `form:"page,default=1,optional"`
	PerPage int    `form:"perPage,default=10,optional"`
	Keyword string `form:"keyword,optional"`
	Status  string `form:"status,optional"`
}

type ByID struct {
	ID int64 `path:"id"`
}

type ByIDs struct {
	IDs []int64 `json:"ids"`
}

// ---- user ----
type UserSaveReq struct {
	ID       int64  `json:"id"`
	Username string `json:"username"`
	Password string `json:"password"`
	Nickname string `json:"nickname"`
	Email    string `json:"email"`
	Phone    string `json:"phone"`
	Avatar   string `json:"avatar"`
	Gender   int    `json:"gender"`
	Status   int    `json:"status"`
	Remark   string `json:"remark"`
	RoleIDs  []int64 `json:"roleIds"`
}

type UserVO struct {
	ID       int64   `json:"id"`
	Username string  `json:"username"`
	Nickname string  `json:"nickname"`
	Email    string  `json:"email"`
	Phone    string  `json:"phone"`
	Avatar   string  `json:"avatar"`
	Gender   int     `json:"gender"`
	Status   int     `json:"status"`
	Remark   string  `json:"remark"`
	RoleIDs  []int64 `json:"roleIds"`
	CreatedAt string  `json:"createdAt"`
}

// ---- role ----
type RoleSaveReq struct {
	ID      int64  `json:"id"`
	Code    string `json:"code"`
	Name    string `json:"name"`
	Sort    int    `json:"sort"`
	Status  int    `json:"status"`
	Remark  string `json:"remark"`
	MenuIDs []int64 `json:"menuIds"`
}

type RoleVO struct {
	ID        int64   `json:"id"`
	Code      string  `json:"code"`
	Name      string  `json:"name"`
	Sort      int     `json:"sort"`
	Status    int     `json:"status"`
	Remark    string  `json:"remark"`
	MenuIDs   []int64 `json:"menuIds"`
	CreatedAt string  `json:"createdAt"`
}

// ---- menu ----
type MenuSaveReq struct {
	ID        int64  `json:"id"`
	ParentID  int64  `json:"parentId"`
	Name      string `json:"name"`
	Path      string `json:"path"`
	Component string `json:"component"`
	Redirect  string `json:"redirect"`
	Icon      string `json:"icon"`
	Type      int    `json:"type"`
	Perms     string `json:"perms"`
	Sort      int    `json:"sort"`
	Visible   int    `json:"visible"`
	Status    int    `json:"status"`
}

type MenuVO struct {
	ID        int64   `json:"id"`
	ParentID  int64   `json:"parentId"`
	Name      string  `json:"name"`
	Path      string  `json:"path"`
	Component string  `json:"component"`
	Redirect  string  `json:"redirect"`
	Icon      string  `json:"icon"`
	Type      int     `json:"type"`
	Perms     string  `json:"perms"`
	Sort      int     `json:"sort"`
	Visible   int     `json:"visible"`
	Status    int     `json:"status"`
	Children  []*MenuVO `json:"children,omitempty"`
}

// ---- config ----
type ConfigSaveReq struct {
	ID     int64  `json:"id"`
	Name   string `json:"name"`
	Key    string `json:"key"`
	Value  string `json:"value"`
	Remark string `json:"remark"`
	Status int    `json:"status"`
}

type ConfigVO struct {
	ID        int64  `json:"id"`
	Name      string `json:"name"`
	Key       string `json:"key"`
	Value     string `json:"value"`
	Remark    string `json:"remark"`
	Status    int    `json:"status"`
	CreatedAt string `json:"createdAt"`
}

// ---- dict ----
type DictSaveReq struct {
	ID     int64  `json:"id"`
	Name   string `json:"name"`
	Code   string `json:"code"`
	Status int    `json:"status"`
	Remark string `json:"remark"`
}

type DictVO struct {
	ID        int64  `json:"id"`
	Name      string  `json:"name"`
	Code      string  `json:"code"`
	Status    int     `json:"status"`
	Remark    string  `json:"remark"`
	CreatedAt string `json:"createdAt"`
}

type DictItemSaveReq struct {
	ID     int64  `json:"id"`
	DictID int64  `json:"dictId"`
	Label  string `json:"label"`
	Value  string `json:"value"`
	Sort   int    `json:"sort"`
	Status int    `json:"status"`
}

type DictItemVO struct {
	ID     int64  `json:"id"`
	DictID int64  `json:"dictId"`
	Label  string `json:"label"`
	Value  string `json:"value"`
	Sort   int    `json:"sort"`
	Status int    `json:"status"`
}

// ---- role/menu assign ----
type AssignRoleMenusReq struct {
	RoleID int64   `json:"roleId"`
	MenuIDs []int64 `json:"menuIds"`
}

type AssignUserRolesReq struct {
	UserID  int64   `json:"userId"`
	RoleIDs []int64 `json:"roleIds"`
}

// ============ Phase 2: demo module ============

// ---- demo product (data list) ----
type ProductListReq struct {
	Page     int    `form:"page,default=1,optional"`
	PerPage  int    `form:"perPage,default=10,optional"`
	Keyword  string `form:"keyword,optional"`
	Category string `form:"category,optional"`
	Status   string `form:"status,optional"`
	SortBy   string `form:"sortBy,optional"` // price|stock|sales|rating|id
	Order    string `form:"order,optional"`  // asc|desc
}

type DemoProductSaveReq struct {
	ID       int64   `json:"id"`
	Name     string  `json:"name"`
	SKU      string  `json:"sku"`
	Category string  `json:"category"`
	Brand    string  `json:"brand"`
	Price    float64 `json:"price"`
	Stock    int     `json:"stock"`
	Sales    int     `json:"sales"`
	Rating   float64 `json:"rating"`
	Status   int     `json:"status"`
	Cover    string  `json:"cover"`
	Tags     string  `json:"tags"`
}

type DemoProductVO struct {
	ID        int64   `json:"id"`
	Name      string  `json:"name"`
	SKU       string  `json:"sku"`
	Category  string  `json:"category"`
	Brand     string  `json:"brand"`
	Price     float64 `json:"price"`
	Stock     int     `json:"stock"`
	Sales     int     `json:"sales"`
	Rating    float64 `json:"rating"`
	Status    int     `json:"status"`
	Cover     string  `json:"cover"`
	Tags      string  `json:"tags"`
	CreatedAt string  `json:"createdAt"`
}

// ---- demo gallery ----
type GalleryListReq struct {
	Page     int    `form:"page,default=1,optional"`
	PerPage  int    `form:"perPage,default=12,optional"`
	Keyword  string `form:"keyword,optional"`
	Category string `form:"category,optional"`
}

type DemoGallerySaveReq struct {
	ID          int64  `json:"id"`
	Title       string `json:"title"`
	Category    string `json:"category"`
	URL         string `json:"url"`
	Thumb       string `json:"thumb"`
	Width       int    `json:"width"`
	Height      int    `json:"height"`
	Likes       int    `json:"likes"`
	Description string `json:"description"`
	Status      int    `json:"status"`
}

type DemoGalleryVO struct {
	ID          int64  `json:"id"`
	Title       string `json:"title"`
	Category    string `json:"category"`
	URL         string `json:"url"`
	Thumb       string `json:"thumb"`
	Width       int    `json:"width"`
	Height      int    `json:"height"`
	Likes       int    `json:"likes"`
	Description string `json:"description"`
	Status      int    `json:"status"`
	CreatedAt   string `json:"createdAt"`
}

// ---- charts / report ----
type NameValue struct {
	Name  string  `json:"name"`
	Value float64 `json:"value"`
}

type TrendPoint struct {
	Date   string  `json:"date"`
	Amount float64 `json:"amount"`
	Orders float64 `json:"orders"`
}

type HeatPoint struct {
	Hour  int     `json:"hour"`
	Day   string  `json:"day"`
	Value float64 `json:"value"`
}

type RadarData struct {
	Indicators []string    `json:"indicators"`
	Series     []NameValue `json:"series"`
}

type ChartOverviewVO struct {
	Summary  []NameValue `json:"summary"`
	Trend    []TrendPoint `json:"trend"`
	Category []NameValue `json:"category"`
	Region   []NameValue `json:"region"`
	Channel  []NameValue `json:"channel"`
	Funnel   []NameValue `json:"funnel"`
	Radar    RadarData   `json:"radar"`
	Heatmap  []HeatPoint `json:"heatmap"`
}

// ---- monitor big-screen ----
type MonitorMetric struct {
	Key      string  `json:"key"`
	Label    string  `json:"label"`
	Value    float64 `json:"value"`
	Unit     string  `json:"unit"`
	Max      float64 `json:"max"`
	Trend    float64 `json:"trend"` // delta vs previous tick
	Level    string  `json:"level"` // ok|warn|danger
}

type TimeValue struct {
	Time  string  `json:"time"`
	Value float64 `json:"value"`
}

type AlertItem struct {
	ID     int64  `json:"id"`
	Level  string `json:"level"` // info|warn|danger
	Title  string `json:"title"`
	Source string `json:"source"`
	Time   string `json:"time"`
}

type ServiceStatus struct {
	Name    string  `json:"name"`
	Status  string  `json:"status"` // healthy|degraded|down
	Latency float64 `json:"latency"`
	Uptime  float64 `json:"uptime"`
}

type MonitorSnapshotVO struct {
	Timestamp   int64           `json:"timestamp"`
	Metrics     []MonitorMetric `json:"metrics"`
	QPS         []TimeValue     `json:"qps"`
	Traffic     []TimeValue     `json:"traffic"`
	OnlineUsers int64           `json:"onlineUsers"`
	TodayOrders int64           `json:"todayOrders"`
	TodayAmount float64         `json:"todayAmount"`
	Conversion  float64         `json:"conversion"`
	Regions     []NameValue     `json:"regions"`
	Alerts      []AlertItem     `json:"alerts"`
	Services    []ServiceStatus `json:"services"`
}