# Pusula provision finishing — git push + migrations + restart
$ErrorActionPreference = "Continue"
$repoRoot = $PSScriptRoot
$log = Join-Path $repoRoot "provision-finish.log"
"=== FINISH ===" | Out-File $log -Encoding utf8

function Log($m) { Write-Host $m; $m | Add-Content $log }

# tokens
$t = @{}
Get-Content (Join-Path $repoRoot "_DEVRETME_silinecek\tokens.env") | ForEach-Object {
  if ($_ -match "^([A-Z_]+)=(.*)$") { $t[$matches[1]] = $matches[2] }
}
$GH_TOKEN = $t["GITHUB_TOKEN"]
$GH_USER = if ($t["GITHUB_USERNAME"]) { $t["GITHUB_USERNAME"] } else { "mehmetdem2005" }

Set-Location $repoRoot

# ── 1. Git: CRLF normalize, sonra push ────────────────
Log ""
Log "[1] Git ayarlari + add + commit + push..."
git config core.autocrlf input 2>&1 | Out-Null
git config user.email "$GH_USER@users.noreply.github.com" 2>&1 | Out-Null
git config user.name $GH_USER 2>&1 | Out-Null

# Tekrar add (errorAction Continue zaten)
git add -A 2>&1 | ForEach-Object { if ($_ -notmatch "warning") { Log $_ } }
git commit -m "chore: pusula initial provision" 2>&1 | ForEach-Object { Log $_ }

$remote = "https://${GH_TOKEN}@github.com/$GH_USER/pusula.git"
git remote remove origin 2>&1 | Out-Null
git remote add origin $remote 2>&1 | Out-Null
git branch -M main 2>&1 | Out-Null
git push -u origin main --force 2>&1 | ForEach-Object { Log $_ }

# ── 2. Migration: panoya yaz + SQL Editor ac ──────────
Log ""
Log "[2] Migration SQL'leri panoya yaz, SQL Editor ac..."
$projectRef = "zbjxkyiyqpesdpyimcmx"
$sqlEditor = "https://supabase.com/dashboard/project/$projectRef/sql/new"

$m1 = Get-Content (Join-Path $repoRoot "packages\db\migrations\0001_init.sql") -Raw
$m2 = Get-Content (Join-Path $repoRoot "packages\db\migrations\0002_hardening.sql") -Raw
$combined = "-- 0001_init.sql + 0002_hardening.sql birlesik`n" + $m1 + "`n`n-- ============ 0002 ============`n" + $m2

# Clipboard'a koy (Set-Clipboard PowerShell 5+)
$combined | Set-Clipboard
Log "Pano'ya iki migration kopyalandi (toplam $($combined.Length) karakter)"
Log "SQL Editor: $sqlEditor"
Log "Tarayicida acilacak — Ctrl+V ile yapistir, 'Run' tikla."

# 3 sn sonra Edge ile SQL Editor ac
Start-Process "msedge.exe" -ArgumentList $sqlEditor

# ── 3. Web dev sunucusunu yenile ──────────────────────
Log ""
Log "[3] Eski web dev surecini bul ve oldur..."
# Next.js dev sunucusu node.exe ile çalışıyor; port 3000'i tutan PID'yi bul
$conn = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -First 1
if ($conn) {
  Log "Port 3000'i tutan PID: $($conn.OwningProcess) — durduruluyor..."
  Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 2
}

# Yeni pencerede web dev
Log "Yeni pencerede pnpm --filter @pusula/web dev calistir..."
$portableDir = Join-Path $env:USERPROFILE "node-portable"
$env:Path = "$portableDir;$env:Path"

Start-Process "powershell.exe" -ArgumentList @(
  "-NoExit",
  "-Command",
  "cd $repoRoot; `$env:Path='$portableDir;'+`$env:Path; & pnpm --filter `@pusula/web dev"
)

Log ""
Log "=== FINISH TAMAM ==="
Log "1. SQL Editor sekmesi acildi — Ctrl+V + Run yap"
Log "2. Yeni web dev sunucusu yeni pencerede basladi"
Log "3. http://localhost:3000/auth/signup -> beta'ya katil -> magic link gercekten gelir"
Log ""
Read-Host "Enter ile cikis"
