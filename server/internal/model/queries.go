package model

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"

	"github.com/zeromicro/go-zero/core/stores/sqlx"
)

var ErrNotFound = sql.ErrNoRows

// ---- generic helpers ----

func execCtx(ctx context.Context, conn sqlx.SqlConn, q string, args ...interface{}) (sql.Result, error) {
	return conn.ExecCtx(ctx, q, args...)
}

// ============================ User ============================

func ListUsers(ctx context.Context, conn sqlx.SqlConn, page, perPage int, keyword, status string) ([]*User, int64, error) {
	where := []string{"1=1"}
	args := []interface{}{}
	if keyword != "" {
		where = append(where, "(username LIKE ? OR nickname LIKE ? OR email LIKE ?)")
		k := "%" + keyword + "%"
		args = append(args, k, k, k)
	}
	if status != "" {
		where = append(where, "status = ?")
		args = append(args, status)
	}
	whereSQL := strings.Join(where, " AND ")

	countQ := fmt.Sprintf("SELECT COUNT(*) FROM sys_user WHERE %s", whereSQL)
	var total int64
	if err := conn.QueryRowCtx(ctx, &total, countQ, args...); err != nil {
		return nil, 0, err
	}
	args = append(args, (page-1)*perPage, perPage)
	q := fmt.Sprintf("SELECT id, username, password, nickname, email, phone, avatar, gender, status, remark, created_at, updated_at FROM sys_user WHERE %s ORDER BY id DESC LIMIT ?, ?", whereSQL)
	var users []*User
	err := conn.QueryRowsCtx(ctx, &users, q, args...)
	if err != nil {
		return nil, 0, err
	}
	return users, total, nil
}

func GetUserByID(ctx context.Context, conn sqlx.SqlConn, id int64) (*User, error) {
	var u User
	q := `SELECT id, username, password, nickname, email, phone, avatar, gender, status, remark, created_at, updated_at FROM sys_user WHERE id = ?`
	err := conn.QueryRowCtx(ctx, &u, q, id)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func GetUserByUsername(ctx context.Context, conn sqlx.SqlConn, name string) (*User, error) {
	var u User
	q := `SELECT id, username, password, nickname, email, phone, avatar, gender, status, remark, created_at, updated_at FROM sys_user WHERE username = ? LIMIT 1`
	err := conn.QueryRowCtx(ctx, &u, q, name)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func CreateUser(ctx context.Context, conn sqlx.SqlConn, u *User) (int64, error) {
	q := `INSERT INTO sys_user (username, password, nickname, email, phone, avatar, gender, status, remark, created_at, updated_at)
	      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`
	r, err := execCtx(ctx, conn, q, u.Username, u.Password, u.Nickname, u.Email, u.Phone, u.Avatar, u.Gender, u.Status, u.Remark)
	if err != nil {
		return 0, err
	}
	return r.LastInsertId()
}

func UpdateUser(ctx context.Context, conn sqlx.SqlConn, u *User) error {
	q := `UPDATE sys_user SET username=?, password=?, nickname=?, email=?, phone=?, avatar=?, gender=?, status=?, remark=?, updated_at=NOW() WHERE id=?`
	_, err := execCtx(ctx, conn, q, u.Username, u.Password, u.Nickname, u.Email, u.Phone, u.Avatar, u.Gender, u.Status, u.Remark, u.ID)
	return err
}

func UpdateUserPassword(ctx context.Context, conn sqlx.SqlConn, id int64, hash string) error {
	_, err := execCtx(ctx, conn, "UPDATE sys_user SET password=?, updated_at=NOW() WHERE id=?", hash, id)
	return err
}

func DeleteUser(ctx context.Context, conn sqlx.SqlConn, id int64) error {
	_, err := execCtx(ctx, conn, "DELETE FROM sys_user WHERE id=?", id)
	return err
}

func BatchDeleteUsers(ctx context.Context, conn sqlx.SqlConn, ids []int64) error {
	if len(ids) == 0 {
		return errors.New("empty id list")
	}
	placeholders := strings.Repeat("?,", len(ids))
	placeholders = placeholders[:len(placeholders)-1]
	args := make([]interface{}, len(ids))
	for i, id := range ids {
		args[i] = id
	}
	_, err := execCtx(ctx, conn, fmt.Sprintf("DELETE FROM sys_user WHERE id IN (%s)", placeholders), args...)
	return err
}

// ============================ Role ============================

func ListRoles(ctx context.Context, conn sqlx.SqlConn, page, perPage int, keyword, status string) ([]*Role, int64, error) {
	where := []string{"1=1"}
	args := []interface{}{}
	if keyword != "" {
		where = append(where, "(code LIKE ? OR name LIKE ?)")
		k := "%" + keyword + "%"
		args = append(args, k, k)
	}
	if status != "" {
		where = append(where, "status=?")
		args = append(args, status)
	}
	whereSQL := strings.Join(where, " AND ")
	var total int64
	if err := conn.QueryRowCtx(ctx, &total, fmt.Sprintf("SELECT COUNT(*) FROM sys_role WHERE %s", whereSQL), args...); err != nil {
		return nil, 0, err
	}
	args = append(args, (page-1)*perPage, perPage)
	q := fmt.Sprintf("SELECT id, code, name, sort, status, remark, created_at, updated_at FROM sys_role WHERE %s ORDER BY sort ASC, id DESC LIMIT ?, ?", whereSQL)
	var roles []*Role
	err := conn.QueryRowsCtx(ctx, &roles, q, args...)
	if err != nil {
		return nil, 0, err
	}
	return roles, total, nil
}

func ListAllRoles(ctx context.Context, conn sqlx.SqlConn) ([]*Role, error) {
	var roles []*Role
	err := conn.QueryRowsCtx(ctx, &roles, "SELECT id, code, name, sort, status, remark, created_at, updated_at FROM sys_role ORDER BY sort ASC, id DESC")
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return nil, err
	}
	return roles, nil
}

func GetRoleByID(ctx context.Context, conn sqlx.SqlConn, id int64) (*Role, error) {
	var r Role
	err := conn.QueryRowCtx(ctx, &r, "SELECT id, code, name, sort, status, remark, created_at, updated_at FROM sys_role WHERE id=?", id)
	if err != nil {
		return nil, err
	}
	return &r, nil
}

func CreateRole(ctx context.Context, conn sqlx.SqlConn, r *Role) (int64, error) {
	rslt, err := execCtx(ctx, conn, "INSERT INTO sys_role (code, name, sort, status, remark, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())",
		r.Code, r.Name, r.Sort, r.Status, r.Remark)
	if err != nil {
		return 0, err
	}
	return rslt.LastInsertId()
}

func UpdateRole(ctx context.Context, conn sqlx.SqlConn, r *Role) error {
	_, err := execCtx(ctx, conn, "UPDATE sys_role SET code=?, name=?, sort=?, status=?, remark=?, updated_at=NOW() WHERE id=?", r.Code, r.Name, r.Sort, r.Status, r.Remark, r.ID)
	return err
}

func DeleteRole(ctx context.Context, conn sqlx.SqlConn, id int64) error {
	_, err := execCtx(ctx, conn, "DELETE FROM sys_role WHERE id=?", id)
	return err
}

// ============================ Menu ============================

func ListMenus(ctx context.Context, conn sqlx.SqlConn, keyword, status string) ([]*Menu, error) {
	where := []string{"1=1"}
	args := []interface{}{}
	if keyword != "" {
		where = append(where, "(name LIKE ? OR path LIKE ?)")
		k := "%" + keyword + "%"
		args = append(args, k, k)
	}
	if status != "" {
		where = append(where, "status=?")
		args = append(args, status)
	}
	q := fmt.Sprintf("SELECT id, parent_id, name, path, component, redirect, icon, type, perms, sort, visible, status FROM sys_menu WHERE %s ORDER BY sort ASC, id ASC", strings.Join(where, " AND "))
	var menus []*Menu
	err := conn.QueryRowsCtx(ctx, &menus, q, args...)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return nil, err
	}
	return menus, nil
}

func GetMenuByID(ctx context.Context, conn sqlx.SqlConn, id int64) (*Menu, error) {
	var m Menu
	err := conn.QueryRowCtx(ctx, &m, "SELECT id, parent_id, name, path, component, redirect, icon, type, perms, sort, visible, status FROM sys_menu WHERE id=?", id)
	if err != nil {
		return nil, err
	}
	return &m, nil
}

func CreateMenu(ctx context.Context, conn sqlx.SqlConn, m *Menu) (int64, error) {
	r, err := execCtx(ctx, conn, `INSERT INTO sys_menu (parent_id, name, path, component, redirect, icon, type, perms, sort, visible, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		m.ParentID, m.Name, m.Path, m.Component, m.Redirect, m.Icon, m.Type, m.Perms, m.Sort, m.Visible, m.Status)
	if err != nil {
		return 0, err
	}
	return r.LastInsertId()
}

func UpdateMenu(ctx context.Context, conn sqlx.SqlConn, m *Menu) error {
	_, err := execCtx(ctx, conn, `UPDATE sys_menu SET parent_id=?, name=?, path=?, component=?, redirect=?, icon=?, type=?, perms=?, sort=?, visible=?, status=? WHERE id=?`,
		m.ParentID, m.Name, m.Path, m.Component, m.Redirect, m.Icon, m.Type, m.Perms, m.Sort, m.Visible, m.Status, m.ID)
	return err
}

func DeleteMenu(ctx context.Context, conn sqlx.SqlConn, id int64) error {
	_, err := execCtx(ctx, conn, "DELETE FROM sys_menu WHERE id=? OR parent_id=?", id, id)
	return err
}

// ============================ Role-Menu-User mapping ============================

func ListRoleMenus(ctx context.Context, conn sqlx.SqlConn, roleID int64) ([]int64, error) {
	var ids []int64
	q := "SELECT menu_id FROM sys_role_menu WHERE role_id=?"
	err := conn.QueryRowsCtx(ctx, &ids, q, roleID)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return nil, err
	}
	return ids, nil
}

func ReplaceRoleMenus(ctx context.Context, conn sqlx.SqlConn, roleID int64, menuIDs []int64) error {
	return conn.TransactCtx(ctx, func(ctx context.Context, s sqlx.Session) error {
		if _, err := s.ExecCtx(ctx, "DELETE FROM sys_role_menu WHERE role_id=?", roleID); err != nil {
			return err
		}
		for _, mid := range menuIDs {
			if _, err := s.ExecCtx(ctx, "INSERT INTO sys_role_menu (role_id, menu_id) VALUES (?, ?)", roleID, mid); err != nil {
				return err
			}
		}
		return nil
	})
}

func ListUserRoles(ctx context.Context, conn sqlx.SqlConn, userID int64) ([]int64, error) {
	var ids []int64
	err := conn.QueryRowsCtx(ctx, &ids, "SELECT role_id FROM sys_user_role WHERE user_id=?", userID)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return nil, err
	}
	return ids, nil
}

func ReplaceUserRoles(ctx context.Context, conn sqlx.SqlConn, userID int64, roleIDs []int64) error {
	return conn.TransactCtx(ctx, func(ctx context.Context, s sqlx.Session) error {
		if _, err := s.ExecCtx(ctx, "DELETE FROM sys_user_role WHERE user_id=?", userID); err != nil {
			return err
		}
		for _, rid := range roleIDs {
			if _, err := s.ExecCtx(ctx, "INSERT INTO sys_user_role (user_id, role_id) VALUES (?, ?)", userID, rid); err != nil {
				return err
			}
		}
		return nil
	})
}

// ListMenuByIDs returns menus for the given ids (used for building user's accessible menus).
func ListMenuByIDs(ctx context.Context, conn sqlx.SqlConn, ids []int64) ([]*Menu, error) {
	if len(ids) == 0 {
		return nil, nil
	}
	placeholders := strings.Repeat("?,", len(ids))
	placeholders = placeholders[:len(placeholders)-1]
	args := make([]interface{}, len(ids))
	for i, id := range ids {
		args[i] = id
	}
	q := fmt.Sprintf("SELECT id, parent_id, name, path, component, redirect, icon, type, perms, sort, visible, status FROM sys_menu WHERE id IN (%s) ORDER BY sort ASC, id ASC", placeholders)
	var menus []*Menu
	err := conn.QueryRowsCtx(ctx, &menus, q, args...)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return nil, err
	}
	return menus, nil
}

// ListMenuButtonPermsByIDs returns permission strings of button-type menus.
func ListMenuButtonPermsByIDs(ctx context.Context, conn sqlx.SqlConn, ids []int64) ([]string, error) {
	menus, err := ListMenuByIDs(ctx, conn, ids)
	if err != nil {
		return nil, err
	}
	out := make([]string, 0, len(menus))
	for _, m := range menus {
		if m.Type == 3 && m.Perms != "" {
			out = append(out, m.Perms)
		}
	}
	return out, nil
}

// ============================ Config ============================

func ListConfigs(ctx context.Context, conn sqlx.SqlConn, page, perPage int, keyword, status string) ([]*Config, int64, error) {
	where := []string{"1=1"}
	args := []interface{}{}
	if keyword != "" {
		where = append(where, "(name LIKE ? OR config_key LIKE ?)")
		k := "%" + keyword + "%"
		args = append(args, k, k)
	}
	if status != "" {
		where = append(where, "status=?")
		args = append(args, status)
	}
	whereSQL := strings.Join(where, " AND ")
	var total int64
	if err := conn.QueryRowCtx(ctx, &total, fmt.Sprintf("SELECT COUNT(*) FROM sys_config WHERE %s", whereSQL), args...); err != nil {
		return nil, 0, err
	}
	args = append(args, (page-1)*perPage, perPage)
	q := fmt.Sprintf("SELECT id, name, config_key, config_value, remark, status, created_at, updated_at FROM sys_config WHERE %s ORDER BY id DESC LIMIT ?, ?", whereSQL)
	var configs []*Config
	err := conn.QueryRowsCtx(ctx, &configs, q, args...)
	if err != nil {
		return nil, 0, err
	}
	return configs, total, nil
}

func GetConfigByKey(ctx context.Context, conn sqlx.SqlConn, key string) (*Config, error) {
	var c Config
	err := conn.QueryRowCtx(ctx, &c, "SELECT id, name, config_key, config_value, remark, status, created_at, updated_at FROM sys_config WHERE config_key=? LIMIT 1", key)
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func CreateConfig(ctx context.Context, conn sqlx.SqlConn, c *Config) (int64, error) {
	r, err := execCtx(ctx, conn, "INSERT INTO sys_config (name, config_key, config_value, remark, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())",
		c.Name, c.Key, c.Value, c.Remark, c.Status)
	if err != nil {
		return 0, err
	}
	return r.LastInsertId()
}

func UpdateConfig(ctx context.Context, conn sqlx.SqlConn, c *Config) error {
	_, err := execCtx(ctx, conn, "UPDATE sys_config SET name=?, config_key=?, config_value=?, remark=?, status=?, updated_at=NOW() WHERE id=?",
		c.Name, c.Key, c.Value, c.Remark, c.Status, c.ID)
	return err
}

func DeleteConfig(ctx context.Context, conn sqlx.SqlConn, id int64) error {
	_, err := execCtx(ctx, conn, "DELETE FROM sys_config WHERE id=?", id)
	return err
}

// ============================ Dict ============================

func ListDicts(ctx context.Context, conn sqlx.SqlConn, page, perPage int, keyword, status string) ([]*Dict, int64, error) {
	where := []string{"1=1"}
	args := []interface{}{}
	if keyword != "" {
		where = append(where, "(name LIKE ? OR code LIKE ?)")
		k := "%" + keyword + "%"
		args = append(args, k, k)
	}
	if status != "" {
		where = append(where, "status=?")
		args = append(args, status)
	}
	whereSQL := strings.Join(where, " AND ")
	var total int64
	if err := conn.QueryRowCtx(ctx, &total, fmt.Sprintf("SELECT COUNT(*) FROM sys_dict WHERE %s", whereSQL), args...); err != nil {
		return nil, 0, err
	}
	args = append(args, (page-1)*perPage, perPage)
	q := fmt.Sprintf("SELECT id, name, code, status, remark, created_at, updated_at FROM sys_dict WHERE %s ORDER BY id DESC LIMIT ?, ?", whereSQL)
	var dicts []*Dict
	err := conn.QueryRowsCtx(ctx, &dicts, q, args...)
	if err != nil {
		return nil, 0, err
	}
	return dicts, total, nil
}

func CreateDict(ctx context.Context, conn sqlx.SqlConn, d *Dict) (int64, error) {
	r, err := execCtx(ctx, conn, "INSERT INTO sys_dict (name, code, status, remark, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())", d.Name, d.Code, d.Status, d.Remark)
	if err != nil {
		return 0, err
	}
	return r.LastInsertId()
}

func UpdateDict(ctx context.Context, conn sqlx.SqlConn, d *Dict) error {
	_, err := execCtx(ctx, conn, "UPDATE sys_dict SET name=?, code=?, status=?, remark=?, updated_at=NOW() WHERE id=?", d.Name, d.Code, d.Status, d.Remark, d.ID)
	return err
}

func DeleteDict(ctx context.Context, conn sqlx.SqlConn, id int64) error {
	return conn.TransactCtx(ctx, func(ctx context.Context, s sqlx.Session) error {
		if _, err := s.ExecCtx(ctx, "DELETE FROM sys_dict_item WHERE dict_id=?", id); err != nil {
			return err
		}
		if _, err := s.ExecCtx(ctx, "DELETE FROM sys_dict WHERE id=?", id); err != nil {
			return err
		}
		return nil
	})
}

func ListDictItems(ctx context.Context, conn sqlx.SqlConn, dictID int64) ([]*DictItem, error) {
	var items []*DictItem
	err := conn.QueryRowsCtx(ctx, &items, "SELECT id, dict_id, label, value, sort, status FROM sys_dict_item WHERE dict_id=? ORDER BY sort ASC, id ASC", dictID)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return nil, err
	}
	return items, nil
}

func CreateDictItem(ctx context.Context, conn sqlx.SqlConn, it *DictItem) (int64, error) {
	r, err := execCtx(ctx, conn, "INSERT INTO sys_dict_item (dict_id, label, value, sort, status) VALUES (?, ?, ?, ?, ?)", it.DictID, it.Label, it.Value, it.Sort, it.Status)
	if err != nil {
		return 0, err
	}
	return r.LastInsertId()
}

func UpdateDictItem(ctx context.Context, conn sqlx.SqlConn, it *DictItem) error {
	_, err := execCtx(ctx, conn, "UPDATE sys_dict_item SET label=?, value=?, sort=?, status=? WHERE id=? AND dict_id=?", it.Label, it.Value, it.Sort, it.Status, it.ID, it.DictID)
	return err
}

func DeleteDictItem(ctx context.Context, conn sqlx.SqlConn, id int64) error {
	_, err := execCtx(ctx, conn, "DELETE FROM sys_dict_item WHERE id=?", id)
	return err
}

// ============================ Phase 2: Demo Product ============================

var allowedProductSort = map[string]string{
	"id":     "id",
	"price":  "price",
	"stock":  "stock",
	"sales":  "sales",
	"rating": "rating",
}

func ListProducts(ctx context.Context, conn sqlx.SqlConn, page, perPage int, keyword, category, status, sortBy, order string) ([]*DemoProduct, int64, error) {
	where := []string{"1=1"}
	args := []interface{}{}
	if keyword != "" {
		where = append(where, "(name LIKE ? OR sku LIKE ? OR brand LIKE ?)")
		k := "%" + keyword + "%"
		args = append(args, k, k, k)
	}
	if category != "" {
		where = append(where, "category = ?")
		args = append(args, category)
	}
	if status != "" {
		where = append(where, "status = ?")
		args = append(args, status)
	}
	whereSQL := strings.Join(where, " AND ")

	var total int64
	if err := conn.QueryRowCtx(ctx, &total, fmt.Sprintf("SELECT COUNT(*) FROM demo_product WHERE %s", whereSQL), args...); err != nil {
		return nil, 0, err
	}

	col, ok := allowedProductSort[sortBy]
	if !ok {
		col = "id"
	}
	dir := "DESC"
	if strings.EqualFold(order, "asc") {
		dir = "ASC"
	}

	args = append(args, (page-1)*perPage, perPage)
	q := fmt.Sprintf(`SELECT id, name, sku, category, brand, price, stock, sales, rating, status, cover, tags, created_at, updated_at
		FROM demo_product WHERE %s ORDER BY %s %s, id DESC LIMIT ?, ?`, whereSQL, col, dir)
	var list []*DemoProduct
	if err := conn.QueryRowsCtx(ctx, &list, q, args...); err != nil && !errors.Is(err, sql.ErrNoRows) {
		return nil, 0, err
	}
	return list, total, nil
}

func GetProductByID(ctx context.Context, conn sqlx.SqlConn, id int64) (*DemoProduct, error) {
	var p DemoProduct
	q := `SELECT id, name, sku, category, brand, price, stock, sales, rating, status, cover, tags, created_at, updated_at FROM demo_product WHERE id=?`
	if err := conn.QueryRowCtx(ctx, &p, q, id); err != nil {
		return nil, err
	}
	return &p, nil
}

func CreateProduct(ctx context.Context, conn sqlx.SqlConn, p *DemoProduct) (int64, error) {
	q := `INSERT INTO demo_product (name, sku, category, brand, price, stock, sales, rating, status, cover, tags, created_at, updated_at)
	      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`
	r, err := execCtx(ctx, conn, q, p.Name, p.SKU, p.Category, p.Brand, p.Price, p.Stock, p.Sales, p.Rating, p.Status, p.Cover, p.Tags)
	if err != nil {
		return 0, err
	}
	return r.LastInsertId()
}

func UpdateProduct(ctx context.Context, conn sqlx.SqlConn, p *DemoProduct) error {
	q := `UPDATE demo_product SET name=?, sku=?, category=?, brand=?, price=?, stock=?, sales=?, rating=?, status=?, cover=?, tags=?, updated_at=NOW() WHERE id=?`
	_, err := execCtx(ctx, conn, q, p.Name, p.SKU, p.Category, p.Brand, p.Price, p.Stock, p.Sales, p.Rating, p.Status, p.Cover, p.Tags, p.ID)
	return err
}

func DeleteProduct(ctx context.Context, conn sqlx.SqlConn, id int64) error {
	_, err := execCtx(ctx, conn, "DELETE FROM demo_product WHERE id=?", id)
	return err
}

func BatchDeleteProducts(ctx context.Context, conn sqlx.SqlConn, ids []int64) error {
	if len(ids) == 0 {
		return errors.New("empty id list")
	}
	ph := strings.TrimSuffix(strings.Repeat("?,", len(ids)), ",")
	args := make([]interface{}, len(ids))
	for i, id := range ids {
		args[i] = id
	}
	_, err := execCtx(ctx, conn, fmt.Sprintf("DELETE FROM demo_product WHERE id IN (%s)", ph), args...)
	return err
}

func ProductStats(ctx context.Context, conn sqlx.SqlConn) ([]*DemoProductStat, error) {
	q := `SELECT category AS name, COUNT(*) AS cnt, COALESCE(SUM(stock),0) AS stock,
	             COALESCE(SUM(sales),0) AS sales, COALESCE(AVG(price),0) AS avg_price
	      FROM demo_product GROUP BY category ORDER BY sales DESC`
	var out []*DemoProductStat
	err := conn.QueryRowsCtx(ctx, &out, q)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return nil, err
	}
	return out, nil
}

func ProductCategories(ctx context.Context, conn sqlx.SqlConn) ([]string, error) {
	var out []string
	err := conn.QueryRowsCtx(ctx, &out, "SELECT DISTINCT category FROM demo_product WHERE category<>'' ORDER BY category")
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return nil, err
	}
	return out, nil
}

// ============================ Phase 2: Demo Gallery ============================

func ListGalleries(ctx context.Context, conn sqlx.SqlConn, page, perPage int, keyword, category string) ([]*DemoGallery, int64, error) {
	where := []string{"1=1"}
	args := []interface{}{}
	if keyword != "" {
		where = append(where, "(title LIKE ? OR description LIKE ?)")
		k := "%" + keyword + "%"
		args = append(args, k, k)
	}
	if category != "" {
		where = append(where, "category = ?")
		args = append(args, category)
	}
	whereSQL := strings.Join(where, " AND ")
	var total int64
	if err := conn.QueryRowCtx(ctx, &total, fmt.Sprintf("SELECT COUNT(*) FROM demo_gallery WHERE %s", whereSQL), args...); err != nil {
		return nil, 0, err
	}
	args = append(args, (page-1)*perPage, perPage)
	q := fmt.Sprintf(`SELECT id, title, category, url, thumb, width, height, likes, description, status, created_at
		FROM demo_gallery WHERE %s ORDER BY id DESC LIMIT ?, ?`, whereSQL)
	var list []*DemoGallery
	if err := conn.QueryRowsCtx(ctx, &list, q, args...); err != nil && !errors.Is(err, sql.ErrNoRows) {
		return nil, 0, err
	}
	return list, total, nil
}

func GetGalleryByID(ctx context.Context, conn sqlx.SqlConn, id int64) (*DemoGallery, error) {
	var g DemoGallery
	q := `SELECT id, title, category, url, thumb, width, height, likes, description, status, created_at FROM demo_gallery WHERE id=?`
	if err := conn.QueryRowCtx(ctx, &g, q, id); err != nil {
		return nil, err
	}
	return &g, nil
}

func CreateGallery(ctx context.Context, conn sqlx.SqlConn, g *DemoGallery) (int64, error) {
	q := `INSERT INTO demo_gallery (title, category, url, thumb, width, height, likes, description, status, created_at) VALUES (?,?,?,?,?,?,?,?,?,NOW())`
	r, err := execCtx(ctx, conn, q, g.Title, g.Category, g.URL, g.Thumb, g.Width, g.Height, g.Likes, g.Description, g.Status)
	if err != nil {
		return 0, err
	}
	return r.LastInsertId()
}

func UpdateGallery(ctx context.Context, conn sqlx.SqlConn, g *DemoGallery) error {
	q := `UPDATE demo_gallery SET title=?, category=?, url=?, thumb=?, width=?, height=?, likes=?, description=?, status=? WHERE id=?`
	_, err := execCtx(ctx, conn, q, g.Title, g.Category, g.URL, g.Thumb, g.Width, g.Height, g.Likes, g.Description, g.Status, g.ID)
	return err
}

func DeleteGallery(ctx context.Context, conn sqlx.SqlConn, id int64) error {
	_, err := execCtx(ctx, conn, "DELETE FROM demo_gallery WHERE id=?", id)
	return err
}

func BatchDeleteGalleries(ctx context.Context, conn sqlx.SqlConn, ids []int64) error {
	if len(ids) == 0 {
		return errors.New("empty id list")
	}
	ph := strings.TrimSuffix(strings.Repeat("?,", len(ids)), ",")
	args := make([]interface{}, len(ids))
	for i, id := range ids {
		args[i] = id
	}
	_, err := execCtx(ctx, conn, fmt.Sprintf("DELETE FROM demo_gallery WHERE id IN (%s)", ph), args...)
	return err
}

func GalleryCategories(ctx context.Context, conn sqlx.SqlConn) ([]*NameCount, error) {
	var out []*NameCount
	q := `SELECT category AS name, COUNT(*) AS cnt FROM demo_gallery GROUP BY category ORDER BY cnt DESC`
	if err := conn.QueryRowsCtx(ctx, &out, q); err != nil && !errors.Is(err, sql.ErrNoRows) {
		return nil, err
	}
	return out, nil
}

// ============================ Phase 2: Chart aggregations ============================

func ChartTrend(ctx context.Context, conn sqlx.SqlConn, days int) ([]*TrendRow, error) {
	q := `SELECT DATE_FORMAT(order_date, '%m-%d') AS d, COALESCE(SUM(amount),0) AS amount, COALESCE(SUM(quantity),0) AS orders
	      FROM demo_order
	      WHERE order_date >= DATE_SUB(CURDATE(), INTERVAL ?-1 DAY)
	      GROUP BY d ORDER BY MIN(order_date)`
	var out []*TrendRow
	if err := conn.QueryRowsCtx(ctx, &out, q, days); err != nil && !errors.Is(err, sql.ErrNoRows) {
		return nil, err
	}
	return out, nil
}

func ChartGroupBy(ctx context.Context, conn sqlx.SqlConn, column string) ([]*NameValueRow, error) {
	allowed := map[string]bool{"category": true, "region": true, "channel": true}
	if !allowed[column] {
		return nil, fmt.Errorf("unsupported group column: %s", column)
	}
	q := fmt.Sprintf(`SELECT %s AS name, COALESCE(SUM(amount),0) AS value, COALESCE(SUM(quantity),0) AS cnt
	                   FROM demo_order GROUP BY %s ORDER BY value DESC`, column, column)
	var out []*NameValueRow
	if err := conn.QueryRowsCtx(ctx, &out, q); err != nil && !errors.Is(err, sql.ErrNoRows) {
		return nil, err
	}
	return out, nil
}

func ChartHeatmap(ctx context.Context, conn sqlx.SqlConn) ([]*HeatRow, error) {
	q := `SELECT DAYOFWEEK(order_date) AS dow, MOD(id * 7, 24) AS hr, COALESCE(SUM(amount),0) AS value
	      FROM demo_order GROUP BY dow, hr`
	var out []*HeatRow
	if err := conn.QueryRowsCtx(ctx, &out, q); err != nil && !errors.Is(err, sql.ErrNoRows) {
		return nil, err
	}
	return out, nil
}

func ChartSummary(ctx context.Context, conn sqlx.SqlConn) (*OrderSummary, error) {
	var s OrderSummary
	q := `SELECT COALESCE(SUM(amount),0) AS amount, COALESCE(SUM(quantity),0) AS orders, COUNT(*) AS rows_cnt FROM demo_order`
	if err := conn.QueryRowCtx(ctx, &s, q); err != nil && !errors.Is(err, sql.ErrNoRows) {
		return nil, err
	}
	return &s, nil
}

func ChartToday(ctx context.Context, conn sqlx.SqlConn) (*OrderSummary, error) {
	var s OrderSummary
	q := `SELECT COALESCE(SUM(amount),0) AS amount, COALESCE(SUM(quantity),0) AS orders, COUNT(*) AS rows_cnt FROM demo_order WHERE order_date = CURDATE()`
	if err := conn.QueryRowCtx(ctx, &s, q); err != nil && !errors.Is(err, sql.ErrNoRows) {
		return nil, err
	}
	return &s, nil
}

func CountProducts(ctx context.Context, conn sqlx.SqlConn) (int64, error) {
	var n int64
	if err := conn.QueryRowCtx(ctx, &n, "SELECT COUNT(*) FROM demo_product"); err != nil {
		return 0, err
	}
	return n, nil
}

func CountGalleries(ctx context.Context, conn sqlx.SqlConn) (int64, error) {
	var n int64
	if err := conn.QueryRowCtx(ctx, &n, "SELECT COUNT(*) FROM demo_gallery"); err != nil {
		return 0, err
	}
	return n, nil
}