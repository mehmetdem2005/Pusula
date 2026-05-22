@echo off
chcp 65001 >nul
set "CWD=%~dp0"
if "%CWD:~-1%"=="\" set "CWD=%CWD:~0,-1%"
set "PATH=%USERPROFILE%\node-portable;%PATH%"
cd /d "%CWD%"

echo === GIT: pnpm-lock + render.yaml + .gitignore push ===
git add .gitignore pnpm-lock.yaml apps/api/render.yaml
git add -A
git commit -m "fix: pnpm-lock.yaml gitignore'dan cikar + render build no-frozen-lockfile"
git push origin main

echo.
echo === RENDER: buildCommand fix + manuel redeploy ===
powershell -ExecutionPolicy Bypass -NoProfile -File "%CWD%\fix-render.ps1"

echo.
echo === TAMAM ===
echo Vercel: GitHub push otomatik tetikledi
echo Render: hem env hem manuel redeploy
echo Yaklasik 5-8 dk icinde ikisi de canli
pause
