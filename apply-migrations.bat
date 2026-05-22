@echo off
chcp 65001 >nul
set "CWD=%~dp0"
if "%CWD:~-1%"=="\" set "CWD=%CWD:~0,-1%"
cd /d "%CWD%\apps\api"
"%USERPROFILE%\node-portable\node.exe" apply-migrations.mjs "%CWD%" > "%CWD%\apply-migrations.log" 2>&1
type "%CWD%\apply-migrations.log"
pause
