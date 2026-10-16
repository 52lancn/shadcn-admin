# Admin Console - shadcn/ui + go-zero

通用前后端管理框架，前端 shadcn/ui + Tailwind + Vite + React 18，后端 go-zero + MySQL + Redis。
Docker Compose 一键起，开箱即用。

## 目录结构

```
52lancn/
├── scripts/                  # 一键启停（固定端口）
│   ├── start.sh
│   ├── stop.sh
│   └── mysql-admin.ini      # 本项目独立 MySQL 实例配置（3307）
├── docker-compose.yml         # 一键起整套：mysql + redis + backend + frontend
├── server/                    # go-zero 后端
│   ├── cmd/api/               # 入口 + 配置 + 路由
│   ├── internal/
│   │   ├── config/            # 配置定义
│   │   ├── handler/           # HTTP handler
│   │   ├── logic/             # 业务逻辑（auth + sys）
│   │   ├── middleware/        # JWT 鉴权 + Perm 校验 + 请求日志
│   │   ├── model/             # 数据访问层（手写 sqlx）
│   │   ├── svc/               # ServiceContext 依赖注入 + 权限缓存
│   │   └── types/             # 请求/响应类型
│   ├── pkg/                   # jwt、ctxx、response、encrypt 工具
│   ├── sql/init.sql           # 数据库 schema + 种子数据
│   ├── Dockerfile
│   └── go.mod
└── web/                       # 前端 Vite + React 18 + TS + shadcn/ui
    ├── src/
    │   ├── components/         # 自实现的 shadcn 组件 (button/card/sheet/table/...)
    │   ├── components/data-table/   # 通用列表组件
    │   ├── hooks/              # useDebouncedState 等
    │   ├── layout/             # Layout（侧边菜单 + 面包屑 + 主题切换）
    │   ├── lib/                # api、http、theme、utils
    │   └── pages/
    │       ├── login/         # 登录页
    │       ├── dashboard/     # 工作台（统计卡 + 趋势图 + 系统状态）
    │       └── system/        # 系统管理：user / role / menu / config / dict / about
    ├── nginx.conf
    ├── Dockerfile
    └── tailwind.config.js
```

## 快速启动（固定端口，一键启停）

```bash
./scripts/start.sh    # 启动全部服务（已在运行则自动跳过，可重复执行）
./scripts/stop.sh     # 停止全部服务
```

地址固定不变：

| 服务 | 地址 | 说明 |
|---|---|---|
| 前端 | http://localhost:5173 | 账号 `admin` / 密码 `123456` |
| 后端 API | http://127.0.0.1:8088 | |
| MySQL | 127.0.0.1:3307 | 库 `admin_db`，`root` / `root123` |
| Redis | 127.0.0.1:6380 | |

注意点：

- MySQL 用的是**本项目独立实例**（datadir `C:/Users/title/mysql/data-52lancn`，配置 `scripts/mysql-admin.ini`），端口 3307，**不会碰你本机 3306 上已有的库**（如 `baibang`）。
- 首次运行会自动初始化数据目录、设置 root 密码并导入 `server/sql/init.sql`。导入强制 `--default-character-set=utf8mb4`：SQL 文件是 UTF-8，而中文 Windows 上 mysql 客户端默认按 GBK 解析，奇数字节的中文（如"工作台"9 字节）会错位导致 `Data too long` 或存成乱码。
- Redis 来自 `C:/Users/title/tools/redis`（Windows 构建）。后端当前并未强依赖 Redis（权限缓存是进程内 map），缺了也能跑。
- 前端设了 `strictPort: true`，5173 被占用时直接报错，不会偷偷切到 5174。

### 方式 2：Docker Compose（部署用）

```bash
docker compose up -d --build
```

访问 http://localhost，账号 `admin` / 密码 `123456`。端口映射：前端 80 / 后端 8088 / MySQL 3307 / Redis 6380。

### 方式 3：手动分别启动

#### 后端

```bash
cd server
# 导入 schema（务必指定 utf8mb4）
mysql -uroot -proot123 --port=3307 --protocol=TCP --default-character-set=utf8mb4 < sql/init.sql
# 启动（配置已固定：8088 端口 / MySQL 3307 / Redis 6380）
go run ./cmd/api -f cmd/api/etc/admin-api.yaml
```

#### 前端

```bash
cd web
pnpm install
pnpm dev   # http://localhost:5173，/api 已代理到 :8088
```

## 主要功能模块

### 系统管理（Phase 1 已完成）

- **用户管理** — 列表（搜索/筛选/分页/排序/批量删除）+ 抽屉式新增编辑 + 角色分配 + 状态切换
- **角色管理** — 同上 + 菜单权限分配（树形勾选）
- **菜单管理** — 三层结构（目录/菜单/按钮）+ 树形展示 + 子菜单新增
- **参数配置** — 系统 K/V 参数
- **字典管理** — 字典 + 字典项两级，行内展开
- **关于本框架** — 技术栈展示页

### 工作台

- 4 张统计卡片
- 7 天访问趋势（Area 图）
- 系统状态（API/MySQL/Redis/磁盘）
- 每日订单柱状图
- 快捷入口

### 主题与外观

- 暗色 / 浅色模式
- 6 套主色（zinc / blue / green / violet / rose / amber）实时切换
- HSL CSS 变量驱动，全组件自动跟随
- 玻璃拟态顶栏、卡片渐变描边

## Phase 2 待办（业务示例）

- 数据列表演示（带排序/筛选/批量删除）
- 图片画廊（带图片大图预览）
- 图表报表（多种图表）
- 大屏监控（数字滚动 + 实时图）

确认后我会接着做 Phase 2。
