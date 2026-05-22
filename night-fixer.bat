@echo off
chcp 65001 >nul
set "CWD=%~dp0"
if "%CWD:~-1%"=="\" set "CWD=%CWD:~0,-1%"
start "Pusula Night Fixer" /min powershell.exe -ExecutionPolicy Bypass -NoProfile -NoExit -File "%CWD%\night-fixer.ps1"
echo Night fixer ayri pencerede minimized basladi.
echo Log: %CWD%\night-fixer.log
timeout /t 3 >nul
