@echo off
chcp 65001 >nul
title Pusula - Web Only (Docker'sız)
echo.
echo ====================================================
echo   PUSULA - Web Only Mod (Docker yok, Supabase yok)
echo   Sadece /apps/web Next.js dev sunucusu acilacak
echo ====================================================
echo.
cd /d "%~dp0"

echo [1/3] Node ve pnpm kontrol...
where node >nul 2>nul
if errorlevel 1 (
  echo HATA: Node.js bulunamadi. https://nodejs.org adresinden 20.x kur.
  pause
  exit /b 1
)
node -v

where pnpm >nul 2>nul
if errorlevel 1 (
  echo pnpm yok - corepack ile kuruluyor...
  call corepack enable
  call corepack prepare pnpm@9.14.4 --activate
)
pnpm -v

echo.
echo [2/3] .env.local dosyalari hazirlaniyor (yoksa)...
if not exist "apps\web\.env.local" copy "apps\web\.env.example" "apps\web\.env.local" >nul

echo.
echo [3/3] Bagimliliklar yukleniyor (1-3 dakika)...
call pnpm install
if errorlevel 1 (
  echo HATA: pnpm install basarisiz.
  pause
  exit /b 1
)

echo.
echo ====================================================
echo   Web dev sunucusu aciliyor (http://localhost:3000)
echo   Tarayici 5 saniye sonra otomatik acilacak.
echo   Durdurmak icin: bu pencerede Ctrl+C
echo ====================================================
echo.

start "" timeout /t 5 /nobreak >nul & start "" http://localhost:3000
call pnpm --filter @pusula/web dev
