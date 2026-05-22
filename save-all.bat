@echo off
chcp 65001 >nul
set "CWD=%~dp0"
if "%CWD:~-1%"=="\" set "CWD=%CWD:~0,-1%"
cd /d "%CWD%"
set "PATH=%USERPROFILE%\node-portable;%PATH%"

echo === Git durum ===
git status --short

echo.
echo === Tum degisiklikleri commit + push ===
git add -A
git commit -m "feat: handoff package + final fixes + voice + multi-agent"
git push origin main

echo.
echo === Render redeploy tetikle (son kod uzerine) ===
powershell -ExecutionPolicy Bypass -NoProfile -Command "$t=@{}; Get-Content '%CWD%\_DEVRETME_silinecek\tokens.env' | ForEach-Object { if ($_ -match '^([A-Z_]+)=(.*)$') { $t[$matches[1]]=$matches[2] } }; $rh=@{ Authorization='Bearer '+$t['RENDER_API_KEY']; Accept='application/json'; 'Content-Type'='application/json' }; try { $d=Invoke-RestMethod -Method Post -Uri 'https://api.render.com/v1/services/srv-d87sfecm0tmc738537b0/deploys' -Headers $rh -Body '{\"clearCache\":\"clear\"}'; Write-Host ('Render deploy: ' + $d.id) } catch { Write-Host ('Render hata: ' + $_.Exception.Message) }"

echo.
echo === GitHub repo: https://github.com/mehmetdem2005/Pusula ===
pause
