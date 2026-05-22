$ErrorActionPreference = "Continue"
$log = Join-Path $PSScriptRoot "final-fix.log"
"=== FINAL FIX $(Get-Date) ===" | Out-File $log -Encoding utf8
function Log($m) { $line = "[$(Get-Date -Format HH:mm:ss)] $m"; Write-Host $line; $line | Add-Content $log }

$t = @{}
Get-Content (Join-Path $PSScriptRoot "_DEVRETME_silinecek\tokens.env") | ForEach-Object {
  if ($_ -match "^([A-Z_]+)=(.*)$") { $t[$matches[1]] = $matches[2] }
}
$RT = $t["RENDER_API_KEY"]
$rh = @{ "Authorization" = "Bearer $RT"; "Accept" = "application/json"; "Content-Type" = "application/json" }

$svc = (Invoke-RestMethod -Method Get -Uri "https://api.render.com/v1/services?name=pusula-api&limit=5" -Headers $rh | Where-Object { $_.service.name -eq "pusula-api" } | Select-Object -First 1).service
$svcId = $svc.id
Log "Service: $svcId"

# Mevcut env vars listele
$existing = Invoke-RestMethod -Method Get -Uri "https://api.render.com/v1/services/$svcId/env-vars?limit=100" -Headers $rh
Log "Mevcut env: $($existing.Count) anahtar"
foreach ($e in $existing) {
  if ($e.envVar.key -like "*NODE*" -or $e.envVar.key -eq "PNPM_VERSION") {
    Log "  $($e.envVar.key) = $($e.envVar.value)"
  }
}

# NODE_VERSION + PNPM_VERSION + NPM_CONFIG fix
$addVars = @{
  "NODE_VERSION" = "20.18.2"
  "PNPM_VERSION" = "9.14.4"
  "NPM_CONFIG_PRODUCTION" = "false"
}
foreach ($k in $addVars.Keys) {
  $v = $addVars[$k]
  $body = @{ value = $v } | ConvertTo-Json
  try {
    Invoke-RestMethod -Method Put -Uri "https://api.render.com/v1/services/$svcId/env-vars/$k" -Headers $rh -Body $body | Out-Null
    Log "  + $k = $v"
  } catch {
    Log "  ! $k HATA: $($_.Exception.Message)"
  }
}

# Build command — minimum, sadece api filter (workspace deps NestJS path resolution'a bırakılır)
$buildCmd = 'corepack enable && corepack prepare pnpm@9.14.4 --activate && pnpm install --no-frozen-lockfile && pnpm --filter "@pusula/api" build'
$startCmd = 'pnpm --filter "@pusula/api" start'

$body = @{
  serviceDetails = @{
    envSpecificDetails = @{ buildCommand = $buildCmd; startCommand = $startCmd }
  }
} | ConvertTo-Json -Depth 5

Log ""
Log "Build command:"
Log "  $buildCmd"
try {
  Invoke-RestMethod -Method Patch -Uri "https://api.render.com/v1/services/$svcId" -Headers $rh -Body $body | Out-Null
  Log "PATCH OK"
} catch {
  Log "PATCH HATA: $($_.Exception.Message)"
}

# Manuel redeploy
try {
  $d = Invoke-RestMethod -Method Post -Uri "https://api.render.com/v1/services/$svcId/deploys" -Headers $rh -Body '{"clearCache":"clear"}'
  Log "Redeploy: $($d.id)"
} catch {
  Log "Redeploy HATA: $($_.Exception.Message)"
}

Log ""
Log "═══ FINAL DURUM ═══"
$VT = $t["VERCEL_TOKEN"]
$vh = @{ "Authorization" = "Bearer $VT" }
$proj = Invoke-RestMethod -Method Get -Uri "https://api.vercel.com/v9/projects/pusula" -Headers $vh
$lastDep = (Invoke-RestMethod -Method Get -Uri "https://api.vercel.com/v6/deployments?projectId=$($proj.id)&limit=1" -Headers $vh).deployments[0]
Log "Vercel: $($lastDep.state) — https://$($lastDep.url)"
Log "Render: $($svc.serviceDetails.url)"
Log ""
Log "Tablolar canli: zbjxkyiyqpesdpyimcmx.supabase.co"
Log "Github: github.com/mehmetdem2005/Pusula"
Log ""
Log "=== FINAL FIX END $(Get-Date) ==="
