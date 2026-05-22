# Pusula Render deploy — pusula-api web service
$ErrorActionPreference = "Continue"
$repoRoot = $PSScriptRoot
$log = Join-Path $repoRoot "render-deploy.log"
"=== RENDER DEPLOY ===" | Out-File $log -Encoding utf8
function Log($m) { Write-Host $m; $m | Add-Content $log }

$t = @{}
Get-Content (Join-Path $repoRoot "_DEVRETME_silinecek\tokens.env") | ForEach-Object {
  if ($_ -match "^([A-Z_]+)=(.*)$") { $t[$matches[1]] = $matches[2] }
}
$RT = $t["RENDER_API_KEY"]
$GH_USER = if ($t["GITHUB_USERNAME"]) { $t["GITHUB_USERNAME"] } else { "mehmetdem2005" }
$projectRef = "zbjxkyiyqpesdpyimcmx"
$supabaseUrl = "https://$projectRef.supabase.co"

# env.local'dan key'leri oku
$apiEnv = Get-Content (Join-Path $repoRoot "apps\api\.env.local") -Raw
$anonKey = ""
$srKey = ""
$jwtSecret = ""
if ($apiEnv -match "SUPABASE_ANON_KEY=(.+)") { $anonKey = $matches[1].Trim() }
if ($apiEnv -match "SUPABASE_SERVICE_ROLE_KEY=(.+)") { $srKey = $matches[1].Trim() }
if ($apiEnv -match "SUPABASE_JWT_SECRET=(.+)") { $jwtSecret = $matches[1].Trim() }

$rh = @{ "Authorization" = "Bearer $RT"; "Content-Type" = "application/json"; "Accept" = "application/json" }

# ── 1. Owner ID ─────────────────────────────────────
Log "[1] Render owners..."
$owners = Invoke-RestMethod -Method Get -Uri "https://api.render.com/v1/owners" -Headers $rh
$ownerId = $owners[0].owner.id
Log "Owner: $($owners[0].owner.name) (id=$ownerId)"

# ── 2. Service var mi? ──────────────────────────────
Log ""
Log "[2] 'pusula-api' servis kontrol..."
$services = Invoke-RestMethod -Method Get -Uri "https://api.render.com/v1/services?name=pusula-api&limit=20" -Headers $rh
$existing = $services | Where-Object { $_.service.name -eq "pusula-api" } | Select-Object -First 1

if ($existing) {
  Log "Var: $($existing.service.id)"
  $serviceId = $existing.service.id
}
else {
  Log "Yok, olusturuluyor (free plan, Frankfurt)..."
  $envVars = @(
    @{ key = "NODE_ENV"; value = "production" },
    @{ key = "PORT"; value = "10000" },
    @{ key = "LOG_LEVEL"; value = "info" },
    @{ key = "APP_VERSION"; value = "0.0.1" },
    @{ key = "SUPABASE_URL"; value = $supabaseUrl },
    @{ key = "SUPABASE_ANON_KEY"; value = $anonKey },
    @{ key = "SUPABASE_SERVICE_ROLE_KEY"; value = $srKey },
    @{ key = "SUPABASE_JWT_SECRET"; value = $jwtSecret },
    @{ key = "DATABASE_URL"; value = "postgresql://placeholder" },
    @{ key = "REDIS_URL"; value = "redis://placeholder" },
    @{ key = "CORS_ALLOWED_ORIGINS"; value = "https://pusula.vercel.app,http://localhost:3000" },
    @{ key = "EXT_IDS"; value = "" },
    @{ key = "THROTTLE_TTL_MS"; value = "60000" },
    @{ key = "THROTTLE_LIMIT"; value = "60" },
    @{ key = "THROTTLE_LLM_LIMIT"; value = "20" },
    @{ key = "OTEL_SERVICE_NAME"; value = "pusula-api" }
  )

  $body = @{
    type = "web_service"
    name = "pusula-api"
    ownerId = $ownerId
    repo = "https://github.com/$GH_USER/Pusula"
    branch = "main"
    autoDeploy = "yes"
    rootDir = "."
    serviceDetails = @{
      env = "node"
      region = "frankfurt"
      plan = "free"
      buildCommand = "corepack enable && pnpm install --frozen-lockfile && pnpm --filter @pusula/shared build || true && pnpm --filter @pusula/scoring build || true && pnpm --filter @pusula/llm-gateway build || true && pnpm --filter @pusula/api build"
      startCommand = "pnpm --filter @pusula/api start"
      healthCheckPath = "/health"
      envSpecificDetails = @{
        buildCommand = "corepack enable && pnpm install --frozen-lockfile && pnpm --filter @pusula/api build"
        startCommand = "pnpm --filter @pusula/api start"
      }
    }
    envVars = $envVars
  } | ConvertTo-Json -Depth 10

  try {
    $resp = Invoke-RestMethod -Method Post -Uri "https://api.render.com/v1/services" -Headers $rh -Body $body
    $serviceId = $resp.service.id
    Log "Olusturuldu: $serviceId"
    Log "Dashboard: $($resp.service.dashboardUrl)"
  }
  catch {
    Log "HATA: $($_.Exception.Message)"
    Log "Body deneme: $body"
    # Hatanin gercek mesajini cek
    try {
      $rawErr = $_.ErrorDetails.Message
      Log "Detay: $rawErr"
    } catch {}
  }
}

if ($serviceId) {
  Log ""
  Log "[3] Servis durumu..."
  $svc = Invoke-RestMethod -Method Get -Uri "https://api.render.com/v1/services/$serviceId" -Headers $rh
  Log "URL: $($svc.serviceDetails.url)"
  Log "Auto-deploy: ilk push'tan sonra build basliyor"
  Log "Dashboard: https://dashboard.render.com/web/$serviceId"
}

Log ""
Log "=== RENDER DEPLOY TAMAM ==="
Log "API URL (build bitince ~5-10 dk): pusula-api.onrender.com"
Log "Sentry/PostHog/Redis (opsiyonel) sonra eklenebilir"
Log ""
Read-Host "Enter ile cikis"
