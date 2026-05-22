$ErrorActionPreference = "Continue"
$t = @{}
Get-Content (Join-Path $PSScriptRoot "_DEVRETME_silinecek\tokens.env") | ForEach-Object {
  if ($_ -match "^([A-Z_]+)=(.*)$") { $t[$matches[1]] = $matches[2] }
}
$RT = $t["RENDER_API_KEY"]
$rh = @{ "Authorization" = "Bearer $RT"; "Accept" = "application/json"; "Content-Type" = "application/json" }

$svc = (Invoke-RestMethod -Method Get -Uri "https://api.render.com/v1/services?name=pusula-api&limit=5" -Headers $rh | Where-Object { $_.service.name -eq "pusula-api" } | Select-Object -First 1).service
$svcId = $svc.id
Write-Host "Service: $svcId"

# Build command — `@pusula/api...` ile dependency'leri otomatik dahil
$buildCmd = 'corepack enable && pnpm install --no-frozen-lockfile && pnpm --filter "@pusula/api..." build'
$startCmd = 'pnpm --filter @pusula/api start'

$body = @{
  serviceDetails = @{
    envSpecificDetails = @{
      buildCommand = $buildCmd
      startCommand = $startCmd
    }
  }
} | ConvertTo-Json -Depth 5

Write-Host "Build command:"
Write-Host "  $buildCmd"

try {
  $r = Invoke-RestMethod -Method Patch -Uri "https://api.render.com/v1/services/$svcId" -Headers $rh -Body $body
  Write-Host "PATCH OK"
}
catch {
  Write-Host "PATCH HATA: $($_.Exception.Message)"
  Write-Host "  Detay: $($_.ErrorDetails.Message)"
}

# Manuel redeploy
Write-Host "Redeploy..."
try {
  $d = Invoke-RestMethod -Method Post -Uri "https://api.render.com/v1/services/$svcId/deploys" -Headers $rh -Body '{"clearCache":"clear"}'
  Write-Host "Deploy: $($d.id)"
}
catch {
  Write-Host "Deploy HATA: $($_.Exception.Message)"
}
