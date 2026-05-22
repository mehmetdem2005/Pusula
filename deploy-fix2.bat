@echo off
chcp 65001 >nul
set "CWD=%~dp0"
if "%CWD:~-1%"=="\" set "CWD=%CWD:~0,-1%"
set "PATH=%USERPROFILE%\node-portable;%PATH%"
cd /d "%CWD%"

echo === 1. .env.local dosyalarini git cache'ten kaldir ===
git rm --cached "apps/api/.env.local" 2>nul
git rm --cached "apps/web/.env.local" 2>nul
git rm --cached "apps/extension/.env.local" 2>nul
git rm --cached "_DEVRETME_silinecek/tokens.env" 2>nul

echo.
echo === 2. Push protection'a takilan eski commit'i amend et ===
git add .gitignore pnpm-lock.yaml apps/api/render.yaml
git add -A
REM Push protection eski commit'i reddetti. Bu commit'i amend ile yeniden olustur ki .env.local commit'e girmesin.
git commit --amend -m "fix: pnpm-lock takip + render frozen-lockfile off + .env.local gitignore + voice modul"

echo.
echo === 3. Force-with-lease ile push ===
git push origin main --force-with-lease

echo.
echo === 4. Render redeploy (clear cache) ===
powershell -ExecutionPolicy Bypass -NoProfile -File "%CWD%\fix-render.ps1"

echo.
echo === TAMAM ===
pause
