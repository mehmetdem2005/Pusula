$ErrorActionPreference = "Continue"
$repoRoot = $PSScriptRoot
$log = Join-Path $repoRoot "diag.log"
"=== DEPLOY DIAGNOSTIK ===" | Out-File $log -Encoding utf8
function Log($m) { Write-Host $m; $m | Add-Content $log }

$t = @{}
Get-Content (Join-Path $repoRoot "_DEVRETME_silinecek\tokens.env") | ForEach-Object {
  if ($_ -match "^([A-Z_]+)=(.*)$") { $t[$matches[1]] = $matches[2] }
}
$VT = $t["VERCEL_TOKEN"]
$RT = $t["RENDER_API_KEY"]

# ── VERCEL ─────────────────────────────
Log ""
Log "═══ VERCEL ═══"
$vh = @{ "Authorization" = "Bearer $VT" }
$proj = Invoke-RestMethod -Method Get -Uri "https://api.vercel.com/v9/projects/pusula" -Headers $vh
Log "Project ID: $($proj.id)"
$deps = Invoke-RestMethod -Method Get -Uri "https://api.vercel.com/v6/deployments?projectId=$($proj.id)&limit=3" -Headers $vh
foreach ($d in $deps.deployments) {
  Log ""
  Log "  Deploy: $($d.uid)"
  Log "  State : $($d.state)"
  Log "  URL   : https://$($d.url)"
  if ($d.state -eq "ERROR" -or $d.state -eq "FAILED") {
    Log "  ↓ Build log ↓"
    try {
      $logs = Invoke-RestMethod -Method Get -Uri "https://api.vercel.com/v3/deployments/$($d.uid)/events?direction=backward&follow=0&limit=50" -Headers $vh
      foreach ($evt in $logs) {
        if ($evt.text -and ($evt.text -match "error|Error|ERROR|fail|FAIL|✗|✘")) {
          Log "    $($evt.text)"
        }
      }
    } catch {
      Log "    (log alınamadı: $($_.Exception.Message))"
    }
    break
  }
}

# ── RENDER ─────────────────────────────
Log ""
Log "═══ RENDER ═══"
$rh = @{ "Authorization" = "Bearer $RT"; "Accept" = "application/json" }
$services = Invoke-RestMethod -Method Get -Uri "https://api.render.com/v1/services?name=pusula-api&limit=5" -Headers $rh
$svc = ($services | Where-Object { $_.service.name -eq "pusula-api" } | Select-Object -First 1).service
$svcId = $svc.id
Log "Service ID: $svcId"
$deploys = Invoke-RestMethod -Method Get -Uri "https://api.render.com/v1/services/$svcId/deploys?limit=3" -Headers $rh
foreach ($d in $deploys) {
  Log ""
  Log "  Deploy: $($d.deploy.id)"
  Log "  Status: $($d.deploy.status)"
  Log "  Commit: $($d.deploy.commit.id.Substring(0,7)) — $($d.deploy.commit.message)"
  if ($d.deploy.status -match "fail|error|canceled") {
    Log "  ↓ Logs ↓"
    try {
      $logs = Invoke-RestMethod -Method Get -Uri "https://api.render.com/v1/services/$svcId/deploys/$($d.deploy.id)/logs" -Headers $rh
      foreach ($l in $logs.logs) {
        if ($l.message -match "error|Error|fail|FAIL") {
          Log "    [$($l.timestamp)] $($l.message)"
        }
      }
    } catch {
      Log "    (log alınamadı: $($_.Exception.Message))"
    }
    break
  }
}

Log ""
Log "═══ TANI BITTI ═══"
