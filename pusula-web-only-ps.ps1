# Pusula web-only dev — Node portable + pnpm dev
$ErrorActionPreference = "Continue"
$log = Join-Path $PSScriptRoot "web-startup.log"
"=== PUSULA WEB DEV ===" | Out-File $log -Encoding utf8
"Baslangic: $(Get-Date)" | Add-Content $log

function Log($m) {
  Write-Host $m
  $m | Add-Content $log
}

# Portable Node'u PATH'in basina ekle (mevcut oturum icin)
$portableDir = Join-Path $env:USERPROFILE "node-portable"
if (Test-Path (Join-Path $portableDir "node.exe")) {
  $env:Path = "$portableDir;$env:Path"
  Log ("node : " + (& node -v))
  Log ("pnpm : " + (& pnpm -v))
}
else {
  Log "HATA: node-portable yok. Once pusula-setup.ps1 calistir."
  Read-Host "Enter ile cikis"
  exit 1
}

Set-Location $PSScriptRoot

# Env dosyalari
foreach ($app in @("api","web","extension")) {
  $src = "apps/$app/.env.example"
  $dst = "apps/$app/.env.local"
  if (-not (Test-Path $dst) -and (Test-Path $src)) {
    Copy-Item $src $dst
    Log "Olusturuldu: $dst"
  }
}

Log ""
Log "[1/2] pnpm install (2-3 dakika)..."
& pnpm install 2>&1 | ForEach-Object { Log $_ }

Log ""
Log "[2/2] Web dev sunucu aciliyor (http://localhost:3000)..."

# 10 sn sonra tarayici ac
Start-Job -ScriptBlock {
  Start-Sleep -Seconds 10
  Start-Process "http://localhost:3000"
} | Out-Null

Log "Tarayici 10 saniye sonra otomatik acilacak."
Log "Sunucu icin: Ctrl+C ile durdur."
Log ""

Set-Location $PSScriptRoot
& pnpm --filter "@pusula/web" dev
