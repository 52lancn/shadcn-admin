package model

import "time"

// User
type User struct {
	ID        int64     `db:"id" json:"id"`
	Username  string    `db:"username" json:"username"`
	Password  string    `db:"password" json:"-"`
	Nickname  string    `db:"nickname" json:"nickname"`
	Email     string    `db:"email" json:"email"`
	Phone     string    `db:"phone" json:"phone"`
	Avatar    string    `db:"avatar" json:"avatar"`
	Gender    int       `db:"gender" json:"gender"` // 0:unknown 1:male 2:female
	Status    int       `db:"status" json:"status"` // 1:enable 0:disable
	Remark    string    `db:"remark" json:"remark"`
	CreatedAt time.Time `db:"created_at" json:"createdAt"`
	UpdatedAt time.Time `db:"updated_at" json:"updatedAt"`
}

// Role
type Role struct {
	ID        int64     `db:"id" json:"id"`
	Code      string    `db:"code" json:"code"`
	Name      string    `db:"name" json:"name"`
	Sort      int       `db:"sort" json:"sort"`
	Status    int       `db:"status" json:"status"`
	Remark    string    `db:"remark" json:"remark"`
	CreatedAt time.Time `db:"created_at" json:"createdAt"`
	UpdatedAt time.Time `db:"updated_at" json:"updatedAt"`
}

// Menu - covers both directory / menu / button types
// Type: 1=dir 2=menu 3=button
type Menu struct {
	ID       int64  `db:"id" json:"id"`
	ParentID int64  `db:"parent_id" json:"parentId"`
	Name     string `db:"name" json:"name"`
	Path     string `db:"path" json:"path"`
	Component string `db:"component" json:"component"`
	Redirect string `db:"redirect" json:"redirect"`
	Icon     string `db:"icon" json:"icon"`
	Type     int    `db:"type" json:"type"`
	Perms    string `db:"perms" json:"perms"`    // only for button type
	Sort     int    `db:"sort" json:"sort"`
	Visible  int    `db:"visible" json:"visible"`  // 1 visible 0 hidden
	Status   int    `db:"status" json:"status"`
}

type RoleMenu struct {
	ID     int64 `db:"id" json:"id"`
	RoleID int64 `db:"role_id" json:"roleId"`
	MenuID int64 `db:"menu_id" json:"menuId"`
}

type UserRole struct {
	ID     int64 `db:"id" json:"id"`
	UserID int64 `db:"user_id" json:"userId"`
	RoleID int64 `db:"role_id" json:"roleId"`
}

// Config - system parameters (single-row per key)
type Config struct {
	ID        int64     `db:"id" json:"id"`
	Name      string    `db:"name" json:"name"`
	Key       string    `db:"config_key" json:"key"`
	Value     string    `db:"config_value" json:"value"`
	Remark    string    `db:"remark" json:"remark"`
	Status    int       `db:"status" json:"status"`
	CreatedAt time.Time `db:"created_at" json:"createdAt"`
	UpdatedAt time.Time `db:"updated_at" json:"updatedAt"`
}

// Dict
type Dict struct {
	ID        int64     `db:"id" json:"id"`
	Name      string    `db:"name" json:"name"`
	Code      string    `db:"code" json:"code"`
	Status    int       `db:"status" json:"status"`
	Remark    string    `db:"remark" json:"remark"`
	CreatedAt time.Time `db:"created_at" json:"createdAt"`
	UpdatedAt time.Time `db:"updated_at" json:"updatedAt"`
}

type DictItem struct {
	ID       int64 `db:"id" json:"id"`
	DictID   int64 `db:"dict_id" json:"dictId"`
	Label    string `db:"label" json:"label"`
	Value    string `db:"value" json:"value"`
	Sort     int    `db:"sort" json:"sort"`
	Status   int    `db:"status" json:"status"`
}

// ===================== Phase 2: demo business models =====================

// DemoProduct - drives the "data list" demo (sort / filter / batch delete).
type DemoProduct struct {
	ID        int64     `db:"id" json:"id"`
	Name      string    `db:"name" json:"name"`
	SKU       string    `db:"sku" json:"sku"`
	Category  string    `db:"category" json:"category"`
	Brand     string    `db:"brand" json:"brand"`
	Price     float64   `db:"price" json:"price"`
	Stock     int       `db:"stock" json:"stock"`
	Sales     int       `db:"sales" json:"sales"`
	Rating    float64   `db:"rating" json:"rating"`
	Status    int       `db:"status" json:"status"` // 1 on-sale 0 off-shelf
	Cover     string    `db:"cover" json:"cover"`
	Tags      string    `db:"tags" json:"tags"`
	CreatedAt time.Time `db:"created_at" json:"createdAt"`
	UpdatedAt time.Time `db:"updated_at" json:"updatedAt"`
}

// DemoGallery - drives the "image gallery" demo.
type DemoGallery struct {
	ID          int64     `db:"id" json:"id"`
	Title       string    `db:"title" json:"title"`
	Category    string    `db:"category" json:"category"`
	URL         string    `db:"url" json:"url"`
	Thumb       string    `db:"thumb" json:"thumb"`
	Width       int       `db:"width" json:"width"`
	Height      int       `db:"height" json:"height"`
	Likes       int       `db:"likes" json:"likes"`
	Description string    `db:"description" json:"description"`
	Status      int       `db:"status" json:"status"`
	CreatedAt   time.Time `db:"created_at" json:"createdAt"`
}

// DemoOrder - fact table feeding the charts/report demo.
type DemoOrder struct {
	ID        int64   `db:"id" json:"id"`
	OrderDate string  `db:"order_date" json:"orderDate"`
	Category  string  `db:"category" json:"category"`
	Region    string  `db:"region" json:"region"`
	Channel   string  `db:"channel" json:"channel"`
	Amount    float64 `db:"amount" json:"amount"`
	Quantity  int     `db:"quantity" json:"quantity"`
}

// ---- aggregation row shapes ----

type DemoProductStat struct {
	Name     string  `db:"name" json:"name"`
	Cnt      int64   `db:"cnt" json:"cnt"`
	Stock    int64   `db:"stock" json:"stock"`
	Sales    int64   `db:"sales" json:"sales"`
	AvgPrice float64 `db:"avg_price" json:"avgPrice"`
}

type NameCount struct {
	Name string `db:"name" json:"name"`
	Cnt  int64  `db:"cnt" json:"cnt"`
}

type TrendRow struct {
	D      string  `db:"d" json:"d"`
	Amount float64 `db:"amount" json:"amount"`
	Orders float64 `db:"orders" json:"orders"`
}

type NameValueRow struct {
	Name  string  `db:"name" json:"name"`
	Value float64 `db:"value" json:"value"`
	Cnt   float64 `db:"cnt" json:"cnt"`
}

type HeatRow struct {
	Dow   int     `db:"dow" json:"dow"`
	Hr    int     `db:"hr" json:"hr"`
	Value float64 `db:"value" json:"value"`
}

type OrderSummary struct {
	Amount  float64 `db:"amount" json:"amount"`
	Orders  float64 `db:"orders" json:"orders"`
	RowsCnt int64   `db:"rows_cnt" json:"rowsCnt"`
}