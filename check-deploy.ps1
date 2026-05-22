# Vercel + Render deploy durumu
$repoRoot = $PSScriptRoot
$log = Join-Path $repoRoot "check-deploy.log"
"=== DEPLOY DURUM ===" | Out-File $log -Encoding utf8
function Log($m) { Write-Host $m; $m | Add-Content $log }

$t = @{}
Get-Content (Join-Path $repoRoot "_DEVRETME_silinecek\tokens.env") | ForEach-Object {
  if ($_ -match "^([A-Z_]+)=(.*)$") { $t[$matches[1]] = $matches[2] }
}
$VT = $t["VERCEL_TOKEN"]
$RT = $t["RENDER_API_KEY"]

# ── Vercel ──────────────────────────
Log "── VERCEL ──"
$vh = @{ "Authorization" = "Bearer $VT" }
try {
  $proj = Invoke-RestMethod -Method Get -Uri "https://api.vercel.com/v9/projects/pusula" -Headers $vh
  Log "Proje: $($proj.name) ($($proj.id))"
  Log "Default URL: https://$($proj.alias[0].domain)"
  if ($proj.alias) { foreach ($a in $proj.alias) { Log "  Alias: https://$($a.domain)" } }

  $deps = Invoke-RestMethod -Method Get -Uri "https://api.vercel.com/v6/deployments?projectId=$($proj.id)&limit=3" -Headers $vh
  foreach ($d in $deps.deployments) {
    Log ""
    Log "  Deploy: $($d.uid)"
    Log "  State : $($d.state) ($($d.readyState))"
    Log "  URL   : https://$($d.url)"
    Log "  Time  : $(Get-Date -Date ([DateTimeOffset]::FromUnixTimeMilliseconds($d.createdAt).LocalDateTime) -Format 'HH:mm:ss')"
  }
}
catch {
  Log "Vercel HATA: $($_.Exception.Message)"
}

# ── Render ──────────────────────────
Log ""
Log "── RENDER ──"
$rh = @{ "Authorization" = "Bearer $RT"; "Accept" = "application/json" }
try {
  $services = Invoke-RestMethod -Method Get -Uri "https://api.render.com/v1/services?name=pusula-api&limit=5" -Headers $rh
  $svc = ($services | Where-Object { $_.service.name -eq "pusula-api" } | Select-Object -First 1).service
  Log "Servis: $($svc.name) ($($svc.id))"
  Log "URL    : $($svc.serviceDetails.url)"

  $deploys = Invoke-RestMethod -Method Get -Uri "https://api.render.com/v1/services/$($svc.id)/deploys?limit=3" -Headers $rh
  foreach ($d in $deploys) {
    Log ""
    Log "  Deploy: $($d.deploy.id)"
    Log "  Status: $($d.deploy.status)"
    Log "  Commit: $($d.deploy.commit.id.Substring(0,7)) — $($d.deploy.commit.message)"
    Log "  Started: $($d.deploy.createdAt)"
    Log "  Finished: $($d.deploy.finishedAt)"
  }
}
catch {
  Log "Render HATA: $($_.Exception.Message)"
}

Log ""
Log "=== TAMAM ==="
