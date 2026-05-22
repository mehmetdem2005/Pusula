@echo off
chcp 65001 >nul
set "CWD=%~dp0"
if "%CWD:~-1%"=="\" set "CWD=%CWD:~0,-1%"
powershell -ExecutionPolicy Bypass -NoProfile -File "%CWD%\diag-deploy.ps1"
echo.
echo ─── LOG ───
type "%CWD%\diag.log"
pause
