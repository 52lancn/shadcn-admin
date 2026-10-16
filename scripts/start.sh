#!/usr/bin/env bash
# 52lancn 管理框架 - 一键启动（端口固定，可重复执行，已在运行则跳过）
#
#   MySQL  127.0.0.1:3307  库 admin_db  (root / root123)
#   Redis  127.0.0.1:6380
#   后端   http://127.0.0.1:8088
#   前端   http://localhost:5173
#
# 用法: ./scripts/start.sh      (Git Bash)

set -u
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUN_DIR="$ROOT/.run"
mkdir -p "$RUN_DIR"

MYSQL_BIN="${MYSQL_BIN:-C:/Users/title/mysql/mysql-26.7.0-winx64/bin}"
MYSQL_INI="$ROOT/scripts/mysql-admin.ini"
MYSQL_DATADIR="${MYSQL_DATADIR:-C:/Users/title/mysql/data-52lancn}"
REDIS_BIN="${REDIS_BIN:-C:/Users/title/tools/redis}"
GO_BIN="${GO_BIN:-C:/Go/go/bin}"
NODE_BIN="${NODE_BIN:-C:/Users/title/.workbuddy/binaries/node/versions/22.22.2-6}"
MYSQL_PW="${MYSQL_PW:-root123}"

port_up() { netstat -ano 2>/dev/null | grep -q ":${1} .*LISTENING"; }
wait_port() { for _ in $(seq 1 $(( $2 * 2 ))); do port_up "$1" && return 0; sleep 0.5; done; return 1; }
say() { printf '  %-9s %s\n' "$1" "$2"; }

echo "==> 启动 52lancn 管理框架"

# ---------- 1. MySQL 3307（独立实例，不干扰本机 3306 的 baibang 库） ----------
if port_up 3307; then
  say "MySQL" "已在 3307 运行，跳过"
else
  FRESH=0
  if [ ! -d "$MYSQL_DATADIR/mysql" ]; then
    echo "  MySQL 首次初始化数据目录 $MYSQL_DATADIR ..."
    mkdir -p "$MYSQL_DATADIR"
    "$MYSQL_BIN/mysqld.exe" --defaults-file="$MYSQL_INI" --initialize-insecure > "$RUN_DIR/mysql-init.log" 2>&1
    FRESH=1
  fi
  nohup "$MYSQL_BIN/mysqld.exe" --defaults-file="$MYSQL_INI" > "$RUN_DIR/mysql.log" 2>&1 &
  disown 2>/dev/null || true
  wait_port 3307 60 || { echo "  [x] MySQL 启动失败，见 $RUN_DIR/mysql.log"; exit 1; }
  [ "$FRESH" = "1" ] && "$MYSQL_BIN/mysql.exe" -uroot --port=3307 --protocol=TCP \
      -e "ALTER USER 'root'@'localhost' IDENTIFIED BY '$MYSQL_PW';" 2>/dev/null
  # 库或表缺失就导入（必须 utf8mb4，否则中文会因 GBK 解析错位而乱码/溢出）
  if ! "$MYSQL_BIN/mysql.exe" -uroot -p"$MYSQL_PW" --port=3307 --protocol=TCP \
        -e "USE admin_db" 2>/dev/null; then
    "$MYSQL_BIN/mysql.exe" -uroot -p"$MYSQL_PW" --port=3307 --protocol=TCP \
        --default-character-set=utf8mb4 < "$ROOT/server/sql/init.sql" 2>/dev/null
  fi
  say "MySQL" "已启动 127.0.0.1:3307 (admin_db)"
fi

# ---------- 2. Redis 6380 ----------
if port_up 6380; then
  say "Redis" "已在 6380 运行，跳过"
else
  if [ ! -x "$REDIS_BIN/redis-server.exe" ]; then
    echo "  [!] 未找到 redis-server.exe ($REDIS_BIN)，跳过 Redis（后端当前未强依赖 Redis）"
  else
    ( cd "$RUN_DIR" && nohup "$REDIS_BIN/redis-server.exe" --port 6380 > "$RUN_DIR/redis.log" 2>&1 & ) 
    wait_port 6380 30 && say "Redis" "已启动 127.0.0.1:6380" || echo "  [!] Redis 启动失败，见 $RUN_DIR/redis.log"
  fi
fi

# ---------- 3. 后端 8088 ----------
if port_up 8088; then
  say "后端 API" "已在 8088 运行，跳过"
else
  export PATH="$GO_BIN:$PATH"
  ( cd "$ROOT/server" && go build -o "$RUN_DIR/admin-api.exe" ./cmd/api ) || { echo "  [x] 后端编译失败"; exit 1; }
  nohup "$RUN_DIR/admin-api.exe" -f "$ROOT/server/cmd/api/etc/admin-api.yaml" > "$RUN_DIR/backend.log" 2>&1 &
  disown 2>/dev/null || true
  wait_port 8088 90 && say "后端 API" "已启动 http://127.0.0.1:8088" || { echo "  [x] 后端启动失败，见 $RUN_DIR/backend.log"; exit 1; }
fi

# ---------- 4. 前端 5173 ----------
if port_up 5173; then
  say "前端" "已在 5173 运行，跳过"
else
  export PATH="$NODE_BIN:$PATH"
  ( cd "$ROOT/web" && nohup node node_modules/vite/bin/vite.js > "$RUN_DIR/frontend.log" 2>&1 & )
  wait_port 5173 60 && say "前端" "已启动 http://localhost:5173" || { echo "  [x] 前端启动失败，见 $RUN_DIR/frontend.log"; exit 1; }
fi

echo
echo "  服务地址（固定）:"
echo "    前端   http://localhost:5173      账号 admin / 123456"
echo "    后端   http://127.0.0.1:8088"
echo "    MySQL  127.0.0.1:3307  admin_db   root / root123"
echo "    Redis  127.0.0.1:6380"
echo "  停止: ./scripts/stop.sh"
