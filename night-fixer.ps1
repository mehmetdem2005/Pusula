# Pusula Otonom Gece Düzeltici
# Loop: check Vercel + Render -> fix -> push -> wait -> repeat
$ErrorActionPreference = "Continue"
$repoRoot = $PSScriptRoot
$log = Join-Path $repoRoot "night-fixer.log"
"=== NIGHT FIXER START $(Get-Date) ===" | Out-File $log -Encoding utf8
function Log($m) {
  $ts = Get-Date -Format "HH:mm:ss"
  $line = "[$ts] $m"
  Write-Host $line
  $line | Add-Content $log
}

$t = @{}
Get-Content (Join-Path $repoRoot "_DEVRETME_silinecek\tokens.env") | ForEach-Object {
  if ($_ -match "^([A-Z_]+)=(.*)$") { $t[$matches[1]] = $matches[2] }
}
$VT = $t["VERCEL_TOKEN"]
$RT = $t["RENDER_API_KEY"]
$GH = $t["GITHUB_TOKEN"]
$GH_USER = if ($t["GITHUB_USERNAME"]) { $t["GITHUB_USERNAME"] } else { "mehmetdem2005" }

$vh = @{ "Authorization" = "Bearer $VT" }
$rh = @{ "Authorization" = "Bearer $RT"; "Accept" = "application/json"; "Content-Type" = "application/json" }

$env:Path = (Join-Path $env:USERPROFILE "node-portable") + ";" + $env:Path
Set-Location $repoRoot

function Get-VercelStatus {
  $proj = Invoke-RestMethod -Method Get -Uri "https://api.vercel.com/v9/projects/pusula" -Headers $vh
  $deps = Invoke-RestMethod -Method Get -Uri "https://api.vercel.com/v6/deployments?projectId=$($proj.id)&limit=1" -Headers $vh
  return $deps.deployments[0]
}
function Get-RenderStatus {
  $services = Invoke-RestMethod -Method Get -Uri "https://api.render.com/v1/services?name=pusula-api&limit=5" -Headers $rh
  $svc = ($services | Where-Object { $_.service.name -eq "pusula-api" } | Select-Object -First 1).service
  $deploys = Invoke-RestMethod -Method Get -Uri "https://api.render.com/v1/services/$($svc.id)/deploys?limit=1" -Headers $rh
  return @{ svc = $svc; deploy = $deploys[0].deploy }
}

function GitPushSafe($msg) {
  git add -A 2>&1 | Out-Null
  git commit -m $msg 2>&1 | ForEach-Object { Log $_ }
  git push origin main 2>&1 | ForEach-Object { Log $_ }
}

# ── İlk patch turu: build scripts + Render build command ──
Log "═══ İLK PATCH TURU ═══"
GitPushSafe "fix: build scripts + render command"

# Render build command'i daha sağlam yap
$svc = (Get-RenderStatus).svc
$buildCmd = 'corepack enable && pnpm install --no-frozen-lockfile && pnpm --filter "@pusula/api..." build'
$startCmd = 'pnpm --filter @pusula/api start'
$body = @{
  serviceDetails = @{
    envSpecificDetails = @{ buildCommand = $buildCmd; startCommand = $startCmd }
  }
} | ConvertTo-Json -Depth 5
try {
  Invoke-RestMethod -Method Patch -Uri "https://api.render.com/v1/services/$($svc.id)" -Headers $rh -Body $body | Out-Null
  Log "Render PATCH OK"
}
catch {
  Log "Render PATCH HATA: $($_.Exception.Message)"
}
try {
  $d = Invoke-RestMethod -Method Post -Uri "https://api.render.com/v1/services/$($svc.id)/deploys" -Headers $rh -Body '{"clearCache":"clear"}'
  Log "Render redeploy: $($d.id)"
}
catch {
  Log "Render deploy HATA: $($_.Exception.Message)"
}

# ── İzleme döngüsü: 15 deneme x 90 sn = ~22 dk ──
$maxIter = 15
$waitSec = 90
$verState = $null
$renState = $null

for ($i = 1; $i -le $maxIter; $i++) {
  Start-Sleep -Seconds $waitSec
  Log ""
  Log "─── DÖNGÜ $i/$maxIter ───"

  # Vercel
  $v = Get-VercelStatus
  $verState = $v.state
  Log "Vercel: $verState — https://$($v.url)"

  # Render
  $r = Get-RenderStatus
  $renState = $r.deploy.status
  Log "Render: $renState — $($r.svc.serviceDetails.url)"

  # İkisi de READY/live ise dur
  if ($verState -eq "READY" -and $renState -eq "live") {
    Log ""
    Log "🎉 İKİSİ DE CANLI!"
    break
  }

  # Vercel ERROR ise framework + rootDirectory tekrar PATCH
  if ($verState -eq "ERROR") {
    Log "Vercel error tespit — settings PATCH..."
    $upd = @{
      framework = "nextjs"
      rootDirectory = "apps/web"
      buildCommand = "cd ../.. && pnpm install --no-frozen-lockfile && pnpm --filter @pusula/web build"
      installCommand = "cd ../.. && corepack enable && pnpm install --no-frozen-lockfile"
      outputDirectory = ".next"
      nodeVersion = "20.x"
    } | ConvertTo-Json
    $vh2 = $vh + @{ "Content-Type" = "application/json" }
    try {
      Invoke-RestMethod -Method Patch -Uri "https://api.vercel.com/v9/projects/pusula" -Headers $vh2 -Body $upd | Out-Null
      Log "  Vercel project PATCH OK"
    } catch { Log "  Vercel PATCH HATA: $($_.Exception.Message)" }
  }

  # Render build_failed ise deploy bilgilerinden hata kategorisi belirle
  if ($renState -match "fail|canceled") {
    Log "Render build_failed tespit — events incele..."
    try {
      $evs = Invoke-RestMethod -Method Get -Uri "https://api.render.com/v1/services/$($r.svc.id)/events?limit=5" -Headers $rh
      foreach ($e in $evs) {
        if ($e.event.type -match "deploy_ended|build_ended") {
          Log "  $($e.event.type): reason=$($e.event.details.reason | ConvertTo-Json -Compress)"
        }
      }
    } catch { Log "  Events alınamadı" }

    # Render redeploy (cache temizle)
    try {
      $d = Invoke-RestMethod -Method Post -Uri "https://api.render.com/v1/services/$($r.svc.id)/deploys" -Headers $rh -Body '{"clearCache":"clear"}'
      Log "  Render yeniden deploy: $($d.id)"
    } catch { Log "  Deploy retrigger HATA: $($_.Exception.Message)" }
  }
}

Log ""
Log "═══ FINAL RAPOR ═══"
$v = Get-VercelStatus
$r = Get-RenderStatus
Log "Vercel  : $($v.state) — https://$($v.url)"
Log "Render  : $($r.deploy.status) — $($r.svc.serviceDetails.url)"
Log "Supabase: https://zbjxkyiyqpesdpyimcmx.supabase.co"
Log "GitHub  : https://github.com/$GH_USER/Pusula"
Log ""
Log "=== NIGHT FIXER END $(Get-Date) ==="
