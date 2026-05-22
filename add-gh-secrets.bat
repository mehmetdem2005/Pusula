@echo off
chcp 65001 >nul
set "CWD=%~dp0"
if "%CWD:~-1%"=="\" set "CWD=%CWD:~0,-1%"

REM libsodium-wrappers yüklü mü?
if not exist "%CWD%\node_modules\libsodium-wrappers" (
  echo libsodium-wrappers yükleniyor...
  set "PATH=%USERPROFILE%\node-portable;%PATH%"
  cd /d "%CWD%"
  call pnpm add -w libsodium-wrappers
)

set "PATH=%USERPROFILE%\node-portable;%PATH%"
cd /d "%CWD%\apps\api"
"%USERPROFILE%\node-portable\node.exe" add-gh-secrets.mjs "%CWD%" > "%CWD%\add-gh-secrets.log" 2>&1
type "%CWD%\add-gh-secrets.log"
pause
