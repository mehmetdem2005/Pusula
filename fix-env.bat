@echo off
chcp 65001 >nul
set "CWD=%~dp0"
if "%CWD:~-1%"=="\" set "CWD=%CWD:~0,-1%"
powershell -ExecutionPolicy Bypass -NoProfile -File "%CWD%\fix-env.ps1" > "%CWD%\fix-env.log" 2>&1
type "%CWD%\fix-env.log"
pause
