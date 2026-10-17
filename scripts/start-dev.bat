@echo off
REM ============================================================
REM  Admin Console - local dev environment starter (Windows)
REM  Starts: MySQL(3307) -> Redis(6380) -> Backend(8088) -> Frontend(5173)
REM  Each service runs in its own console window.
REM  NOTE: keep this file ASCII-only to avoid codepage issues.
REM ============================================================
setlocal

set ROOT=%~dp0..
set MYSQL_EXE=C:\Users\title\mysql\mysql-26.7.0-winx64\bin\mysqld.exe
set MYSQL_INI=C:\Users\title\mysql\my.ini
set MYSQL_DATADIR=C:/Users/title/mysql/data-52lancn
set REDIS_EXE=C:\Users\title\tools\redis\redis-server.exe

echo ==========================================
echo  Admin Console local dev starter
echo ==========================================

REM ---- 1) MySQL on 3307 (project datadir) ----
netstat -ano | findstr ":3307" | findstr LISTENING >nul
if %errorlevel%==0 (
  echo [1/4] MySQL already running on 3307 - skip
) else (
  echo [1/4] Starting MySQL on 3307 (datadir=data-52lancn) ...
  start "MySQL-3307" cmd /k "%MYSQL_EXE% --defaults-file=%MYSQL_INI% --datadir=%MYSQL_DATADIR% --port=3307"
  timeout /t 10 /nobreak >nul
)

REM ---- 2) Redis on 6380 ----
netstat -ano | findstr ":6380" | findstr LISTENING >nul
if %errorlevel%==0 (
  echo [2/4] Redis already running on 6380 - skip
) else (
  echo [2/4] Starting Redis on 6380 ...
  start "Redis-6380" cmd /k "%REDIS_EXE% --port 6380"
  timeout /t 3 /nobreak >nul
)

REM ---- 3) Go backend on 8088 ----
netstat -ano | findstr ":8088" | findstr LISTENING >nul
if %errorlevel%==0 (
  echo [3/4] Backend already running on 8088 - skip
) else (
  echo [3/4] Starting backend on 8088 ...
  start "Backend-8088" cmd /k "cd /d %ROOT%\server && bin\admin-api.exe -f cmd\api\etc\admin-api.yaml"
  timeout /t 3 /nobreak >nul
)

REM ---- 4) Frontend on 5173 ----
echo [4/4] Starting frontend on 5173 ...
start "Frontend-5173" cmd /k "cd /d %ROOT%\web && pnpm dev"

echo.
echo Done. Open http://localhost:5173/ after ~15s.
echo Account: admin / 123456
echo.
echo TIP: if pnpm dev fails with SAFE_DELETE_BULK_CONFIRM_REQUIRED,
echo      rename web\node_modules\.vite\deps (e.g. to deps_bak) and re-run.
pause
