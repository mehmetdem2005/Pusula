$ErrorActionPreference = "Continue"
$t = @{}
Get-Content (Join-Path $PSScriptRoot "_DEVRETME_silinecek\tokens.env") | ForEach-Object {
  if ($_ -match "^([A-Z_]+)=(.*)$") { $t[$matches[1]] = $matches[2] }
}
$RT = $t["RENDER_API_KEY"]
$rh = @{ "Authorization" = "Bearer $RT"; "Accept" = "application/json" }

$svc = (Invoke-RestMethod -Method Get -Uri "https://api.render.com/v1/services?name=pusula-api&limit=5" -Headers $rh | Where-Object { $_.service.name -eq "pusula-api" } | Select-Object -First 1).service
$svcId = $svc.id
$deploys = Invoke-RestMethod -Method Get -Uri "https://api.render.com/v1/services/$svcId/deploys?limit=1" -Headers $rh
$lastDep = $deploys[0].deploy
Write-Host "Last deploy: $($lastDep.id) status=$($lastDep.status)"
Write-Host ""

# Log indirme (Render API logs endpoint)
$logUri = "https://api.render.com/v1/logs?resource=$svcId&limit=100&direction=backward&type=build"
try {
  $logs = Invoke-RestMethod -Method Get -Uri $logUri -Headers $rh
  Write-Host "Total logs: $($logs.logs.Count)"
  foreach ($l in $logs.logs) {
    Write-Host "[$($l.timestamp)] $($l.message)"
  }
}
catch {
  Write-Host "Log API hata: $($_.Exception.Message)"
}
