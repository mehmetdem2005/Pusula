# Pusula publish — git push + GitHub secrets + env audit + auto-deploy
$ErrorActionPreference = "Continue"
$repoRoot = $PSScriptRoot
$log = Join-Path $repoRoot "publish.log"
"=== PUBLISH ALL ===" | Out-File $log -Encoding utf8
function Log($m) { Write-Host $m; $m | Add-Content $log }

$t = @{}
Get-Content (Join-Path $repoRoot "_DEVRETME_silinecek\tokens.env") | ForEach-Object {
  if ($_ -match "^([A-Z_]+)=(.*)$") { $t[$matches[1]] = $matches[2] }
}

# PATH'e node-portable ekle
$env:Path = (Join-Path $env:USERPROFILE "node-portable") + ";" + $env:Path

# ── 1. libsodium-wrappers yüklü mü ──
Log "[1] libsodium-wrappers..."
Set-Location $repoRoot
$libsodiumPath = Join-Path $repoRoot "node_modules\libsodium-wrappers"
if (-not (Test-Path $libsodiumPath)) {
  Log "  Yükleniyor..."
  & pnpm add -w libsodium-wrappers 2>&1 | ForEach-Object { Log $_ }
}
else {
  Log "  Yüklü"
}

# ── 2. Git commit + push ──
Log ""
Log "[2] Git push..."
Set-Location $repoRoot
git config user.email "$($t['GITHUB_USERNAME'])@users.noreply.github.com" 2>&1 | Out-Null
git config user.name $t['GITHUB_USERNAME'] 2>&1 | Out-Null
git add -A 2>&1 | Out-Null
git commit -m "feat: voice + supabase migrate workflow + GH secrets automation" 2>&1 | ForEach-Object { Log $_ }
git push origin main 2>&1 | ForEach-Object { Log $_ }

# ── 3. GitHub Secrets ekle ──
Log ""
Log "[3] GitHub Secrets ekleniyor..."
Set-Location (Join-Path $repoRoot "apps\api")
& node add-gh-secrets.mjs $repoRoot 2>&1 | ForEach-Object { Log $_ }

# ── 4. fix-env (varsa, lokal+Vercel+Render env'ler) ──
Log ""
Log "[4] Env audit + fix..."
Set-Location $repoRoot
if (Test-Path (Join-Path $repoRoot "fix-env.ps1")) {
  & (Join-Path $repoRoot "fix-env.ps1") 2>&1 | ForEach-Object { Log $_ }
}

Log ""
Log "=== PUBLISH TAMAM ==="
Log ""
Log "Otomasyon zinciri:"
Log "  git push  -> Vercel auto-deploy (web)"
Log "  git push  -> Render auto-deploy (API)"
Log "  packages/db/migrations/** -> supabase-migrate workflow (DB)"
Log ""
Read-Host "Enter ile cikis"
