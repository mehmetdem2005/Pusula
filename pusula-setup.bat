@echo off
chcp 65001 >nul
set "LOG=%~dp0setup.log"
title Pusula Setup - Node + pnpm kuruluyor
echo. > "%LOG%"
echo === PUSULA SETUP === >> "%LOG%"
echo Baslangic: %DATE% %TIME% >> "%LOG%"
echo. >> "%LOG%"

echo ====================================================
echo   PUSULA SETUP - Node.js + pnpm kurulumu
echo   Bu pencere kapanmayacak. Log: %LOG%
echo ====================================================
echo.

REM === 1. winget var mi ===
echo [1] winget kontrol... >> "%LOG%"
where winget >> "%LOG%" 2>&1
where winget >nul 2>nul
if %errorlevel%==0 (
  echo winget bulundu, Node LTS kuruluyor...
  echo winget bulundu, Node LTS kuruluyor... >> "%LOG%"
  winget install -e --id OpenJS.NodeJS.LTS --silent --accept-source-agreements --accept-package-agreements >> "%LOG%" 2>&1
  goto :after_install
)

REM === 2. winget yoksa MSI indir ===
echo winget yok. Node 20 LTS MSI indiriliyor...
echo winget yok. Node 20 LTS MSI indiriliyor... >> "%LOG%"

set "MSI=%TEMP%\node-lts-x64.msi"
powershell -NoProfile -Command "try { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.18.2/node-v20.18.2-x64.msi' -OutFile '%MSI%' -UseBasicParsing; Write-Host 'Indirildi' } catch { Write-Host ('HATA: ' + $_.Exception.Message); exit 1 }" >> "%LOG%" 2>&1

if not exist "%MSI%" (
  echo MSI indirilemedi! Internet baglantisi yoksa elle kurun.
  echo MSI indirilemedi! >> "%LOG%"
  pause
  exit /b 1
)

echo MSI indirildi: %MSI% >> "%LOG%"
echo Sessiz kurulum baslatiliyor (admin onayi cikabilir)...
msiexec /i "%MSI%" /qn /norestart /L*v "%TEMP%\node-msi-install.log"
echo msiexec exit: %errorlevel% >> "%LOG%"

:after_install
echo.
echo [2] PATH'i yeniden yukle ve Node'u kontrol et... >> "%LOG%"

REM Node varsayilan kurulumda C:\Program Files\nodejs altina iner — PATH'i bu oturum icin guncelle
set "PATH=%PATH%;C:\Program Files\nodejs;%APPDATA%\npm"

where node >> "%LOG%" 2>&1
node -v >> "%LOG%" 2>&1
where npm >> "%LOG%" 2>&1
npm -v >> "%LOG%" 2>&1

echo.
echo [3] corepack aktif, pnpm 9.14.4 hazirlaniyor... >> "%LOG%"
corepack enable >> "%LOG%" 2>&1
corepack prepare pnpm@9.14.4 --activate >> "%LOG%" 2>&1

where pnpm >> "%LOG%" 2>&1
pnpm -v >> "%LOG%" 2>&1

echo.
echo === SETUP TAMAM === >> "%LOG%"
echo Bitis: %DATE% %TIME% >> "%LOG%"
echo.
echo ====================================================
echo   KURULUM TAMAMLANDI
echo   Sonraki adim: pusula-web-only.bat'i calistir
echo ====================================================
echo.
type "%LOG%"
echo.
echo Pencereyi kapatmak icin bir tusa bas...
pause
