@echo off
chcp 65001 >nul
set "LOG=%~dp0dev-startup.log"
title Pusula - Debug Startup
echo. > "%LOG%"
echo === PUSULA DEBUG STARTUP === >> "%LOG%"
echo Tarih: %DATE% %TIME% >> "%LOG%"
echo Klasor: %~dp0 >> "%LOG%"
echo. >> "%LOG%"

echo [1] Node kontrol... >> "%LOG%"
where node >> "%LOG%" 2>&1
node -v >> "%LOG%" 2>&1
echo. >> "%LOG%"

echo [2] pnpm kontrol... >> "%LOG%"
where pnpm >> "%LOG%" 2>&1
pnpm -v >> "%LOG%" 2>&1
echo. >> "%LOG%"

echo [3] npm kontrol... >> "%LOG%"
where npm >> "%LOG%" 2>&1
npm -v >> "%LOG%" 2>&1
echo. >> "%LOG%"

echo [4] corepack kontrol... >> "%LOG%"
where corepack >> "%LOG%" 2>&1
corepack -v >> "%LOG%" 2>&1
echo. >> "%LOG%"

echo [5] git kontrol... >> "%LOG%"
where git >> "%LOG%" 2>&1
git --version >> "%LOG%" 2>&1
echo. >> "%LOG%"

echo [6] docker kontrol... >> "%LOG%"
where docker >> "%LOG%" 2>&1
docker -v >> "%LOG%" 2>&1
echo. >> "%LOG%"

echo [7] PATH... >> "%LOG%"
echo %PATH% >> "%LOG%"
echo. >> "%LOG%"

echo [8] Klasor icerigi (apps/web): >> "%LOG%"
dir /b "%~dp0apps\web" >> "%LOG%" 2>&1
echo. >> "%LOG%"

echo [9] Klasor icerigi (root, package.json): >> "%LOG%"
type "%~dp0package.json" >> "%LOG%" 2>&1
echo. >> "%LOG%"

echo === DEBUG TAMAM === >> "%LOG%"

cmd /K type "%LOG%"
