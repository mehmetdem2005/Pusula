@echo off
chcp 65001 >nul
set "CWD=%~dp0"
if "%CWD:~-1%"=="\" set "CWD=%CWD:~0,-1%"
start /min "Pusula Night Fixer" powershell -ExecutionPolicy Bypass -NoProfile -File "%CWD%\night-fixer.ps1"
echo Night fixer minimized arka planda calisiyor.
echo Log: %CWD%\night-fixer.log
timeout /t 5
