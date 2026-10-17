@echo off
REM ============================================================
REM  Admin Console - local dev environment stopper (Windows)
REM  Stops: Frontend(5173) -> Backend(8088) -> Redis(6380) -> MySQL(3307)
REM  Order matters: app layer first, data layer last.
REM  NOTE: keep this file ASCII-only to avoid codepage issues.
REM ============================================================
setlocal enabledelayedexpansion

set MYSQL_BIN=C:\Users\title\mysql\mysql-26.7.0-winx64\bin
set REDIS_BIN=C:\Users\title\tools\redis
set MYSQL_PWD=root123
set DRYRUN=0
if /I "%~1"=="-n" set DRYRUN=1
if /I "%~1"=="--dry-run" set DRYRUN=1

echo ==========================================
echo  Admin Console local dev stopper
if %DRYRUN%==1 echo  *** DRY RUN: nothing will be killed ***
echo ==========================================

REM ---- 1) Frontend 5173 ----
call :killPort 5173 "Frontend"
REM ---- 2) Backend 8088 ----
call :killPort 8088 "Backend"
REM ---- 3) Redis 6380 (graceful first) ----
call :stopRedis
REM ---- 4) MySQL 3307 (graceful first) ----
call :stopMySQL

echo.
echo Done. Verify with: netstat -ano ^| findstr ":3307 :6380 :8088 :5173"
echo.
if %DRYRUN%==1 exit /b 0
if /I "%~1"=="-y" exit /b 0
pause
exit /b 0

REM ============================================================
:killPort
set PORT=%~1
set LABEL=%~2
set FOUND=0
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%PORT% " ^| findstr "LISTENING"') do (
  if not "%%a"=="0" (
    if !FOUND!==0 (
      echo [stop] %LABEL% on %PORT% - killing PID %%a ...
    )
    if %DRYRUN%==0 taskkill /F /T /PID %%a >nul 2>&1
    set FOUND=1
  )
)
if !FOUND!==0 echo [skip] %LABEL% on %PORT% - not running
exit /b 0

REM ============================================================
:stopRedis
netstat -ano | findstr ":6380 " | findstr "LISTENING" >nul
if not %errorlevel%==0 (
  echo [skip] Redis on 6380 - not running
  exit /b 0
)
echo [stop] Redis on 6380 - graceful shutdown ...
if %DRYRUN%==1 (
  echo [dry] would run: redis-cli -p 6380 shutdown
  exit /b 0
)
"%REDIS_BIN%\redis-cli.exe" -p 6380 shutdown >nul 2>&1
timeout /t 2 /nobreak >nul
netstat -ano | findstr ":6380 " | findstr "LISTENING" >nul
if %errorlevel%==0 (
  echo [warn] graceful shutdown failed, force killing ...
  call :killPort 6380 "Redis"
) else (
  echo [ok] Redis stopped
)
exit /b 0

REM ============================================================
:stopMySQL
netstat -ano | findstr ":3307 " | findstr "LISTENING" >nul
if not %errorlevel%==0 (
  echo [skip] MySQL on 3307 - not running
  exit /b 0
)
echo [stop] MySQL on 3307 - graceful shutdown ...
if %DRYRUN%==1 (
  echo [dry] would run: mysqladmin -h127.0.0.1 -P3307 -uroot -p**** shutdown
  exit /b 0
)
"%MYSQL_BIN%\mysqladmin.exe" -h127.0.0.1 -P3307 -uroot -p%MYSQL_PWD% shutdown >nul 2>&1
timeout /t 5 /nobreak >nul
netstat -ano | findstr ":3307 " | findstr "LISTENING" >nul
if %errorlevel%==0 (
  echo [warn] graceful shutdown failed, force killing ...
  call :killPort 3307 "MySQL"
) else (
  echo [ok] MySQL stopped
)
exit /b 0
