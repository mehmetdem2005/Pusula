@echo off
chcp 65001 >nul
set "CWD=%~dp0"
if "%CWD:~-1%"=="\" set "CWD=%CWD:~0,-1%"
powershell -ExecutionPolicy Bypass -NoProfile -File "%CWD%\check-deploy.ps1" > "%CWD%\check-deploy.log" 2>&1
type "%CWD%\check-deploy.log"
pause
