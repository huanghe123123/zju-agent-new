@echo off
title 浙大校园助手 - 启动器
cd /d "%~dp0"

echo ================================================
echo   浙大校园助手 - 一键开发启动
echo   后端: http://127.0.0.1:7788
echo   前端: http://localhost:5173
echo ================================================
echo.

rem ---- 环境检查 ----
where node >nul 2>nul || (
    echo [错误] 未检测到 Node.js，请先安装 Node.js 20 或更高版本: https://nodejs.org
    pause
    exit /b 1
)

where pnpm >nul 2>nul
if errorlevel 1 (
    echo [提示] 未检测到 pnpm，尝试通过 corepack 启用...
    corepack enable >nul 2>nul
    where pnpm >nul 2>nul
    if errorlevel 1 (
        echo [错误] pnpm 仍不可用，请手动执行: npm install -g pnpm
        pause
        exit /b 1
    )
)

rem ---- 首次运行自动安装依赖 ----
if not exist "node_modules" (
    echo [提示] 首次运行，正在安装依赖（可能需要几分钟）...
    call pnpm install
    if errorlevel 1 (
        echo [错误] 依赖安装失败，请检查网络后重试。
        pause
        exit /b 1
    )
    echo.
)

rem ---- 端口占用检测（已在运行则跳过，避免重复启动）----
set "BACKEND_RUNNING=0"
set "FRONTEND_RUNNING=0"
netstat -ano | findstr /c:":7788" | findstr /c:"LISTENING" >nul 2>nul && set "BACKEND_RUNNING=1"
netstat -ano | findstr /c:":5173" | findstr /c:"LISTENING" >nul 2>nul && set "FRONTEND_RUNNING=1"

if "%BACKEND_RUNNING%"=="1" (
    echo [跳过] 后端已在运行（端口 7788 被占用）。
) else (
    echo [启动] 后端 Fastify 服务...
    start "zju-agent 后端 (7788)" cmd /k "pnpm dev:server"
)

if "%FRONTEND_RUNNING%"=="1" (
    echo [跳过] 前端已在运行（端口 5173 被占用）。
) else (
    echo [启动] 前端 Vite 开发服务器...
    start "zju-agent 前端 (5173)" cmd /k "pnpm dev:web"
)

rem ---- 等待服务就绪后打开浏览器（约 6 秒）----
echo [提示] 等待服务就绪...
ping -n 7 127.0.0.1 >nul
start "" "http://localhost:5173/"

echo.
echo ==================================================
echo   启动完成！前后端各运行在一个独立命令行窗口中，
echo   关闭对应窗口即可停止该服务。本窗口可以关闭。
echo ==================================================
echo.
pause
