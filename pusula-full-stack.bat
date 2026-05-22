@echo off
chcp 65001 >nul
title Pusula - Full Stack (Docker + Web + API + Extension)
echo.
echo ====================================================
echo   PUSULA - Full Stack baslangic
echo ====================================================
echo.
cd /d "%~dp0"

echo [1/5] Gereksinim kontrolu...
where node >nul 2>nul || (echo HATA: Node.js gerekli ^(20.x^). && pause && exit /b 1)
where docker >nul 2>nul || (echo UYARI: Docker yok - DB calismayacak. Sadece web+API stub.)
where pnpm >nul 2>nul || (call corepack enable & call corepack prepare pnpm@9.14.4 --activate)
node -v
pnpm -v

echo.
echo [2/5] .env.local dosyalari...
for %%a in (api web extension) do (
  if not exist "apps\%%a\.env.local" copy "apps\%%a\.env.example" "apps\%%a\.env.local" >nul
)

echo.
echo [3/5] Bagimliliklar yukleniyor...
call pnpm install
if errorlevel 1 (echo HATA: install basarisiz. && pause && exit /b 1)

echo.
echo [4/5] Docker servisleri (Postgres + Redis)...
where docker >nul 2>nul && (
  docker compose up -d
  timeout /t 3 /nobreak >nul
  docker compose ps
)

echo.
echo [5/5] Dev sunuculari paralel acilacak. Tarayici 8 sn sonra.
start "" timeout /t 8 /nobreak >nul & start "" http://localhost:3000

echo.
echo ====================================================
echo   Pusula dev sunuculari calisiyor.
echo   Web:       http://localhost:3000
echo   API:       http://localhost:3001
echo   Extension: apps\extension\dist (chrome://extensions Load unpacked)
echo   Durdurmak icin: Ctrl+C
echo ====================================================
echo.
call pnpm dev
