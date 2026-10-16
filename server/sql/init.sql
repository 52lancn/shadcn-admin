-- ============================================================
-- admin_db schema - generated for the admin-api project
-- ============================================================
CREATE DATABASE IF NOT EXISTS admin_db DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE admin_db;

-- ---------- user ----------
CREATE TABLE IF NOT EXISTS sys_user (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  username   VARCHAR(64)  NOT NULL,
  password   VARCHAR(128) NOT NULL,
  nickname   VARCHAR(64)  DEFAULT '',
  email      VARCHAR(128) DEFAULT '',
  phone      VARCHAR(32)  DEFAULT '',
  avatar     VARCHAR(255) DEFAULT '',
  gender     TINYINT      DEFAULT 0,
  status     TINYINT      DEFAULT 1,
  remark     VARCHAR(255) DEFAULT '',
  created_at DATETIME     DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- role ----------
CREATE TABLE IF NOT EXISTS sys_role (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  code       VARCHAR(64)  NOT NULL,
  name       VARCHAR(64)  NOT NULL,
  sort       INT          DEFAULT 0,
  status     TINYINT      DEFAULT 1,
  remark     VARCHAR(255) DEFAULT '',
  created_at DATETIME     DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- menu ----------
CREATE TABLE IF NOT EXISTS sys_menu (
  id        BIGINT AUTO_INCREMENT PRIMARY KEY,
  parent_id BIGINT       DEFAULT 0,
  name      VARCHAR(64)  NOT NULL,
  path      VARCHAR(255) DEFAULT '',
  component VARCHAR(255) DEFAULT '',
  redirect  VARCHAR(255) DEFAULT '',
  icon      VARCHAR(64)   DEFAULT '',
  type      TINYINT      DEFAULT 2,   -- 1 dir / 2 menu / 3 button
  perms     VARCHAR(128) DEFAULT '',
  sort      INT          DEFAULT 0,
  visible   TINYINT      DEFAULT 1,
  status    TINYINT      DEFAULT 1,
  INDEX idx_parent (parent_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- role-menu ----------
CREATE TABLE IF NOT EXISTS sys_role_menu (
  id      BIGINT AUTO_INCREMENT PRIMARY KEY,
  role_id BIGINT NOT NULL,
  menu_id BIGINT NOT NULL,
  UNIQUE KEY uk_role_menu (role_id, menu_id),
  INDEX idx_role (role_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- user-role ----------
CREATE TABLE IF NOT EXISTS sys_user_role (
  id      BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  role_id BIGINT NOT NULL,
  UNIQUE KEY uk_user_role (user_id, role_id),
  INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- config ----------
CREATE TABLE IF NOT EXISTS sys_config (
  id           BIGINT AUTO_INCREMENT PRIMARY KEY,
  name         VARCHAR(64)  NOT NULL,
  config_key  VARCHAR(128) NOT NULL,
  config_value TEXT,
  remark       VARCHAR(255) DEFAULT '',
  status       TINYINT      DEFAULT 1,
  created_at   DATETIME     DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_key (config_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- dict ----------
CREATE TABLE IF NOT EXISTS sys_dict (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(64)  NOT NULL,
  code       VARCHAR(64)  NOT NULL,
  status     TINYINT      DEFAULT 1,
  remark     VARCHAR(255) DEFAULT '',
  created_at DATETIME     DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sys_dict_item (
  id       BIGINT AUTO_INCREMENT PRIMARY KEY,
  dict_id BIGINT NOT NULL,
  label   VARCHAR(64) NOT NULL,
  value   VARCHAR(64) NOT NULL,
  sort    INT DEFAULT 0,
  status  TINYINT DEFAULT 1,
  INDEX idx_dict (dict_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- Seed data
-- ============================================================
-- admin password hash for "123456" (bcrypt)
INSERT INTO sys_user (id, username, password, nickname, email, status, remark)
VALUES (1, 'admin', '$2a$10$K9Aq9jhbvqW9fjK.BcTSKuVAq7rFjBGNwY7b64OhjdYHCIBiYLd2i', 'Super Admin', 'admin@example.com', 1, 'super administrator')
ON DUPLICATE KEY UPDATE password='$2a$10$K9Aq9jhbvqW9fjK.BcTSKuVAq7rFjBGNwY7b64OhjdYHCIBiYLd2i';

INSERT INTO sys_role (id, code, name, sort, status, remark) VALUES
  (1, 'admin', 'Super Admin', 1, 1, 'all permissions'),
  (2, 'user',  'Normal User', 2, 1, 'basic user')
ON DUPLICATE KEY UPDATE code=code;

INSERT INTO sys_user_role (user_id, role_id) VALUES (1, 1)
ON DUPLICATE KEY UPDATE user_id=user_id;

-- ---------- menu seeds ----------
INSERT INTO sys_menu (id, parent_id, name, path, component, icon, type, perms, sort, visible, status) VALUES
  (1, 0, '系统管理', '/system', '', 'Settings', 1, '', 100, 1, 1),
  (2, 1, '用户管理', '/system/user', 'system/user/index', 'Users', 2, '', 1, 1, 1),
  (3, 1, '角色管理', '/system/role', 'system/role/index', 'Shield', 2, '', 2, 1, 1),
  (4, 1, '菜单管理', '/system/menu', 'system/menu/index', 'Menu', 2, '', 3, 1, 1),
  (5, 1, '参数配置', '/system/config', 'system/config/index', 'SlidersHorizontal', 2, '', 4, 1, 1),
  (6, 1, '字典管理', '/system/dict', 'system/dict/index', 'BookOpen', 2, '', 5, 1, 1),
  (7, 0, '工作台', '/dashboard', 'dashboard/index', 'LayoutDashboard', 2, '', 1, 1, 1),
  (8, 0, '业务示例', '/demo', '', 'Boxes', 1, '', 50, 1, 1),
  (9, 8, '数据列表', '/demo/data-list', 'demo/DataList/index', 'Table', 2, '', 1, 1, 1),
  (10, 8, '图片画廊', '/demo/gallery', 'demo/Gallery/index', 'Image', 2, '', 2, 1, 1),
  (11, 8, '图表报表', '/demo/charts', 'demo/Charts/index', 'BarChart3', 2, '', 3, 1, 1),
  (12, 8, '大屏监控', '/demo/screen', 'demo/Screen/index', 'MonitorPlay', 2, '', 4, 1, 1),
  (13, 1, '关于本框架', '/system/about', 'system/about/index', 'Info', 2, '', 99, 1, 1)
ON DUPLICATE KEY UPDATE name=name;

-- ---------- button perms ----------
INSERT INTO sys_menu (parent_id, name, type, perms, sort, visible, status) VALUES
  (2, '新增', 3, 'sys:user:add', 1, 0, 1),
  (2, '编辑', 3, 'sys:user:edit', 2, 0, 1),
  (2, '删除', 3, 'sys:user:del', 3, 0, 1),
  (3, '新增', 3, 'sys:role:add', 1, 0, 3),
  (3, '编辑', 3, 'sys:role:edit', 2, 0, 1),
  (3, '删除', 3, 'sys:role:del', 3, 0, 1),
  (4, '新增', 3, 'sys:menu:add', 1, 0, 1),
  (4, '编辑', 3, 'sys:menu:edit', 1, 0, 1),
  (4, '删除', 3, 'sys:menu:del', 1, 0, 1),
  (5, '新增', 3, 'sys:config:add', 1, 0, 1),
  (5, '编辑', 3, 'sys:config:edit', 1, 0, 1),
  (5, '删除', 3, 'sys:config:del', 1, 0, 1),
  (6, '新增', 3, 'sys:dict:add', 1, 0, 1),
  (6, '编辑', 3, 'sys:dict:edit', 1, 0, 1),
  (6, '删除', 3, 'sys:dict:del', 1, 0, 1);

-- super admin role gets every menu
INSERT INTO sys_role_menu (role_id, menu_id)
SELECT 1, id FROM sys_menu
ON DUPLICATE KEY UPDATE role_id=role_id;

-- ---------- sample config ----------
INSERT INTO sys_config (name, config_key, config_value, remark, status) VALUES
  ('系统名称', 'sys.title', 'Admin Console', '页面与登录页标题', 1),
  ('系统副标题', 'sys.subtitle', 'shadcn/ui + go-zero | Senior Dev Framework', '登录页副标题', 1),
  ('主题默认色', 'sys.theme', 'zinc', '主题色名 zinc/gray/blue/green', 1)
ON DUPLICATE KEY UPDATE name=name;

-- ---------- sample dict ----------
INSERT INTO sys_dict (name, code, status, remark) VALUES
  ('性别', 'gender', 1, ''), 
  ('用户状态', 'user_status', 1, '')
ON DUPLICATE KEY UPDATE name=name;

SET @gid = (SELECT id FROM sys_dict WHERE code='gender');
SET @sid = (SELECT id FROM sys_dict WHERE code='user_status');
INSERT INTO sys_dict_item (dict_id, label, value, sort, status) VALUES
  (@gid, '未知', '0', 1, 1),
  (@gid, '男',   '1', 2, 1),
  (@gid, '女',   '2', 3, 1),
  (@sid, '禁用', '0', 1, 1),
  (@sid, '启用', '1', 2, 1);