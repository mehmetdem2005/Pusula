@echo off
chcp 65001 >nul
set "CWD=%~dp0"
if "%CWD:~-1%"=="\" set "CWD=%CWD:~0,-1%"
cd /d "%CWD%"
set "PATH=%USERPROFILE%\node-portable;%PATH%"

git add packages/llm-gateway/src/adapters/openai-compat.ts
git commit -m "fix: openai-compat exactOptionalPropertyTypes uyumu (max_tokens, stream)"
git push origin main

echo.
echo Render redeploy:
powershell -ExecutionPolicy Bypass -NoProfile -Command "$t=@{}; Get-Content '%CWD%\_DEVRETME_silinecek\tokens.env' | ForEach-Object { if ($_ -match '^([A-Z_]+)=(.*)$') { $t[$matches[1]]=$matches[2] } }; $rh=@{ Authorization='Bearer '+$t['RENDER_API_KEY']; Accept='application/json'; 'Content-Type'='application/json' }; $d=Invoke-RestMethod -Method Post -Uri 'https://api.render.com/v1/services/srv-d87sfecm0tmc738537b0/deploys' -Headers $rh -Body '{\"clearCache\":\"clear\"}'; Write-Host ('Deploy ID: ' + $d.id)"

pause
