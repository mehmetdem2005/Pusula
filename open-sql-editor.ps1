# SQL'i panoya kopyala + SQL Editor sekmesini Edge'de ac
$repoRoot = $PSScriptRoot
$projectRef = "zbjxkyiyqpesdpyimcmx"
$m1 = Get-Content (Join-Path $repoRoot "packages\db\migrations\0001_init.sql") -Raw
$m2 = Get-Content (Join-Path $repoRoot "packages\db\migrations\0002_hardening.sql") -Raw
$combined = "-- Pusula migration paketi (0001 + 0002)`n`n" + $m1 + "`n`n-- ============ 0002_hardening.sql ============`n`n" + $m2
$combined | Set-Clipboard
Write-Host "Pano'ya $($combined.Length) karakter kopyalandi."

$url = "https://supabase.com/dashboard/project/$projectRef/sql/new"
Write-Host "Edge'de aciliyor: $url"
Start-Process "msedge.exe" -ArgumentList $url

Write-Host ""
Write-Host "============================================="
Write-Host "  YAPACAGIN: SQL Editor sekmesinde"
Write-Host "  1) Ctrl+V  (migration yapisir)"
Write-Host "  2) Sag altta 'Run' butonu"
Write-Host "  3) 'Success. No rows returned' gor"
Write-Host "============================================="
