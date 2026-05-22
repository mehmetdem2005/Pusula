@echo off
chcp 65001 >nul
set "CWD=%~dp0"
if "%CWD:~-1%"=="\" set "CWD=%CWD:~0,-1%"
powershell -ExecutionPolicy Bypass -NoProfile -File "%CWD%\final-fix.ps1"
echo.
echo --- LOG ---
type "%CWD%\final-fix.log"
pause
