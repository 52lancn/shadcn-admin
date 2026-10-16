#!/usr/bin/env bash
# 52lancn 管理框架 - 停止全部服务（MySQL 3307 / Redis 6380 / 后端 8088 / 前端 5173）
set -u

kill_port() {
  local port=$1
  local pid
  pid=$(netstat -ano 2>/dev/null | grep ":${port} " | grep LISTENING | awk '{print $NF}' | head -1)
  if [ -n "$pid" ]; then
    taskkill //F //PID "$pid" >/dev/null 2>&1 \
      && printf '  %-9s 已停止 (pid %s)\n' "$2" "$pid" \
      || printf '  %-9s 停止失败 (pid %s)\n' "$2" "$pid"
  else
    printf '  %-9s 未运行\n' "$2"
  fi
}

echo "==> 停止 52lancn 管理框架"
kill_port 5173 "前端"
kill_port 8088 "后端 API"
kill_port 6380 "Redis"
kill_port 3307 "MySQL"
echo "  完成"
