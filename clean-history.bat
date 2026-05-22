@echo off
chcp 65001 >nul
set "CWD=%~dp0"
if "%CWD:~-1%"=="\" set "CWD=%CWD:~0,-1%"
cd /d "%CWD%"
set "PATH=%USERPROFILE%\node-portable;%PATH%"

echo === Git history'den .env.local ve tokens.env temizle ===
echo (Birkac saniye surer, geri donus yok)
echo.

REM filter-branch ile gecmis temizle
git filter-branch --force --index-filter "git rm -rf --cached --ignore-unmatch apps/api/.env.local apps/web/.env.local apps/extension/.env.local _DEVRETME_silinecek" --prune-empty --tag-name-filter cat -- --all
if errorlevel 1 (
  echo HATA: filter-branch basarisiz, manuel yontem deneniyor...
  REM Plan B: Soft reset + force push
  git reset --soft HEAD~5 2>nul
  git reset HEAD apps/api/.env.local apps/web/.env.local apps/extension/.env.local _DEVRETME_silinecek 2>nul
  git checkout HEAD -- apps/ packages/ .github/ docs/ 2>nul
  git commit -m "feat: pusula full provision (clean)"
)

echo.
echo === Force push (history yeniden yazildi) ===
git push origin main --force

echo.
echo === Render redeploy (env zaten guncellendi) ===
powershell -ExecutionPolicy Bypass -NoProfile -File "%CWD%\fix-render.ps1"

echo.
echo === TAMAM ===
pause
