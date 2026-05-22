# Pusula Portable Node + pnpm kurulumu (admin gerekmez)
$ErrorActionPreference = "Continue"
$log = Join-Path $PSScriptRoot "setup.log"
"=== PUSULA PORTABLE SETUP ===" | Out-File $log -Encoding utf8
"Baslangic: $(Get-Date)" | Add-Content $log

function Log($m) {
  Write-Host $m
  $m | Add-Content $log
}

$portableDir = Join-Path $env:USERPROFILE "node-portable"
$nodeExe = Join-Path $portableDir "node.exe"

# Eger zaten kuruluysa
if (Test-Path $nodeExe) {
  Log "Portable Node zaten kurulu: $portableDir"
}
else {
  Log ""
  Log "[1] Node.js 20 LTS portable indiriliyor..."
  $zip = Join-Path $env:TEMP "node-portable.zip"
  $url = "https://nodejs.org/dist/v20.18.2/node-v20.18.2-win-x64.zip"
  try {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Log "URL: $url"
    Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing
    $size = (Get-Item $zip).Length
    Log ("Zip indi: " + [Math]::Round($size/1MB,1) + " MB")
  }
  catch {
    Log ("HATA: " + $_.Exception.Message)
    Read-Host "Enter ile cikis"
    exit 1
  }

  Log ""
  Log "[2] Zip aciliyor: $portableDir"
  if (Test-Path $portableDir) {
    Remove-Item $portableDir -Recurse -Force
  }
  Expand-Archive -Path $zip -DestinationPath (Split-Path $portableDir) -Force

  # Aciilan klasor adi node-v20.18.2-win-x64 — yeniden adlandir
  $extracted = Join-Path (Split-Path $portableDir) "node-v20.18.2-win-x64"
  if (Test-Path $extracted) {
    Rename-Item $extracted (Split-Path $portableDir -Leaf)
  }
  Remove-Item $zip -Force -ErrorAction SilentlyContinue
}

if (-not (Test-Path $nodeExe)) {
  Log "HATA: $nodeExe bulunamadi"
  Read-Host "Enter ile cikis"
  exit 1
}

# Bu PowerShell oturumu icin PATH'e ekle
$env:Path = "$portableDir;$env:Path"

Log ""
Log "[3] Surumler:"
Log ("node : " + (& $nodeExe -v))
$npmCmd = Join-Path $portableDir "npm.cmd"
Log ("npm  : " + (& $npmCmd -v))

Log ""
Log "[4] corepack + pnpm 9.14.4..."
$corepackCmd = Join-Path $portableDir "corepack.cmd"
try {
  & $corepackCmd enable 2>&1 | ForEach-Object { Log $_ }
  & $corepackCmd prepare pnpm@9.14.4 --activate 2>&1 | ForEach-Object { Log $_ }
  $pnpmCmd = Join-Path $portableDir "pnpm.cmd"
  if (Test-Path $pnpmCmd) {
    Log ("pnpm : " + (& $pnpmCmd -v))
  }
  else {
    Log "pnpm.cmd hala yok, alternatif: npm i -g pnpm"
    & $npmCmd install -g pnpm@9.14.4 2>&1 | ForEach-Object { Log $_ }
  }
}
catch {
  Log ("corepack HATA: " + $_.Exception.Message)
}

Log ""
Log "[5] PATH'i kalici olarak user scope'a ekle..."
$userPath = [System.Environment]::GetEnvironmentVariable("Path", "User")
if ($userPath -notlike "*$portableDir*") {
  $newPath = if ([string]::IsNullOrEmpty($userPath)) { $portableDir } else { "$portableDir;$userPath" }
  [System.Environment]::SetEnvironmentVariable("Path", $newPath, "User")
  Log "Eklendi: $portableDir (yeni cmd/pwsh pencerelerinde aktif)"
}
else {
  Log "PATH'de zaten var"
}

Log ""
Log "=== SETUP TAMAM ==="
Log "Bitis: $(Get-Date)"
Log ""
Log "Sonraki adim: pusula-web-only-ps.ps1 calistir (BU PENCEREDE BAŞKA SCRIPT calistir)"
Log ""
Read-Host "Enter ile cikis"
