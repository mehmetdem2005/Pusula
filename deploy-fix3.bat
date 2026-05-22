@echo off
chcp 65001 >nul
set "CWD=%~dp0"
if "%CWD:~-1%"=="\" set "CWD=%CWD:~0,-1%"
cd /d "%CWD%"
set "PATH=%USERPROFILE%\node-portable;%PATH%"

echo === Git: package.json'lara build script eklendi, push ===
git add -A
git commit -m "fix: build scripts to shared/scoring/llm-gateway"
git push origin main

echo.
echo === Render: build command basitlestir + clear-cache redeploy ===
powershell -ExecutionPolicy Bypass -NoProfile -File "%CWD%\fix-render2.ps1" > "%CWD%\fix-render2.log" 2>&1
type "%CWD%\fix-render2.log"

echo.
pause
