# Pusula env audit + otomatik doldurma
$ErrorActionPreference = "Continue"
$repoRoot = $PSScriptRoot
$log = Join-Path $repoRoot "fix-env.log"
"=== ENV AUDIT + FIX ===" | Out-File $log -Encoding utf8
function Log($m) { Write-Host $m; $m | Add-Content $log }

$t = @{}
Get-Content (Join-Path $repoRoot "_DEVRETME_silinecek\tokens.env") | ForEach-Object {
  if ($_ -match "^([A-Z_]+)=(.*)$") { $t[$matches[1]] = $matches[2] }
}

$VT = $t["VERCEL_TOKEN"]
$RT = $t["RENDER_API_KEY"]
$DB_PASS = $t["SUPABASE_DB_PASSWORD"]
$projectRef = "zbjxkyiyqpesdpyimcmx"
$supabaseUrl = "https://$projectRef.supabase.co"
$renderApiUrl = "https://pusula-api-1x9a.onrender.com"

# Lokal env'lerden Supabase keys oku
$apiEnv = Get-Content (Join-Path $repoRoot "apps\api\.env.local") -Raw
$anonKey = ""; $srKey = ""; $jwtSecret = ""
if ($apiEnv -match "(?m)^SUPABASE_ANON_KEY=(.+)$") { $anonKey = $matches[1].Trim() }
if ($apiEnv -match "(?m)^SUPABASE_SERVICE_ROLE_KEY=(.+)$") { $srKey = $matches[1].Trim() }
if ($apiEnv -match "(?m)^SUPABASE_JWT_SECRET=(.+)$") { $jwtSecret = $matches[1].Trim() }

# Render Postgres connection (pooler)
$DB_PASS_ENC = if ($DB_PASS) { [uri]::EscapeDataString($DB_PASS) } else { "MISSING" }
$dbUrl = "postgresql://postgres.$projectRef`:$DB_PASS_ENC@aws-1-eu-central-1.pooler.supabase.com:6543/postgres"

# Vercel project URL'i  (production alias)
$vh = @{ "Authorization" = "Bearer $VT" }
$proj = Invoke-RestMethod -Method Get -Uri "https://api.vercel.com/v9/projects/pusula" -Headers $vh
$vercelDomain = "https://pusula-$($proj.accountId.Substring(0,4).ToLower())-projects.vercel.app"
foreach ($a in $proj.alias) {
  if ($a.domain -like "*.vercel.app") { $vercelDomain = "https://$($a.domain)"; break }
}
Log "Vercel default URL: $vercelDomain"

# Tum env CORS allowlist
$corsAllowlist = "http://localhost:3000,$vercelDomain,https://pusula.vercel.app"

# ──────────────── 1. LOCAL apps/api/.env.local ────────────────
Log ""
Log "── 1. apps/api/.env.local ──"

function SetLocalEnv($file, $key, $value) {
  $c = Get-Content $file -Raw
  if ($c -match "(?m)^$key=") {
    $c = $c -replace "(?m)^$key=.*$", "$key=$value"
  } else {
    $c = $c.TrimEnd() + "`n$key=$value"
  }
  $c | Out-File $file -Encoding utf8 -NoNewline
}

$apiFile = Join-Path $repoRoot "apps\api\.env.local"
$updates = @{
  "DATABASE_URL" = $dbUrl
  "CORS_ALLOWED_ORIGINS" = $corsAllowlist
  "MANAGED_GROQ_KEY" = $t["GROQ_API_KEY"]
  "MANAGED_GEMINI_KEY" = $t["GEMINI_API_KEY"]
  "MANAGED_DEEPSEEK_KEY" = $t["DEEPSEEK_API_KEY"]
}
foreach ($k in $updates.Keys) {
  if (-not $updates[$k]) { continue }
  SetLocalEnv $apiFile $k $updates[$k]
  Log "  + $k"
}

# ──────────────── 2. LOCAL apps/web/.env.local ────────────────
Log ""
Log "── 2. apps/web/.env.local ──"
$webFile = Join-Path $repoRoot "apps\web\.env.local"
SetLocalEnv $webFile "NEXT_PUBLIC_API_BASE_URL" "http://localhost:3001"
SetLocalEnv $webFile "NEXT_PUBLIC_APP_URL" "http://localhost:3000"
Log "  + NEXT_PUBLIC_API_BASE_URL"
Log "  + NEXT_PUBLIC_APP_URL"

# ──────────────── 3. VERCEL ENV VARS ────────────────
Log ""
Log "── 3. Vercel project env ──"
$projectId = $proj.id

# Listele
$existing = (Invoke-RestMethod -Method Get -Uri "https://api.vercel.com/v9/projects/$projectId/env?decrypt=false" -Headers $vh).envs
$existingKeys = $existing | ForEach-Object { $_.key }
Log "  Mevcut: $($existingKeys.Count) env"

$vercelTarget = @{
  "NEXT_PUBLIC_API_BASE_URL" = $renderApiUrl
  "NEXT_PUBLIC_APP_URL" = $vercelDomain
}

foreach ($k in $vercelTarget.Keys) {
  $v = $vercelTarget[$k]
  if (-not $v) { continue }
  $b = @{
    key = $k
    value = $v
    target = @("production","preview","development")
    type = "plain"
  } | ConvertTo-Json
  try {
    Invoke-RestMethod -Method Post -Uri "https://api.vercel.com/v10/projects/$projectId/env?upsert=true" -Headers ($vh + @{ "Content-Type" = "application/json" }) -Body $b | Out-Null
    Log "  + $k -> $v"
  }
  catch {
    Log "  ! $k Vercel HATA: $($_.Exception.Message)"
  }
}

# ──────────────── 4. RENDER ENV VARS ────────────────
Log ""
Log "── 4. Render service env ──"
$rh = @{ "Authorization" = "Bearer $RT"; "Accept" = "application/json"; "Content-Type" = "application/json" }
$services = Invoke-RestMethod -Method Get -Uri "https://api.render.com/v1/services?name=pusula-api&limit=5" -Headers $rh
$svcId = ($services | Where-Object { $_.service.name -eq "pusula-api" } | Select-Object -First 1).service.id
Log "  Service: $svcId"

$existingRender = Invoke-RestMethod -Method Get -Uri "https://api.render.com/v1/services/$svcId/env-vars?limit=50" -Headers $rh
$existingRenderKeys = $existingRender | ForEach-Object { $_.envVar.key }
Log "  Mevcut Render env: $($existingRenderKeys.Count)"

$renderTarget = @{
  "DATABASE_URL" = $dbUrl
  "CORS_ALLOWED_ORIGINS" = $corsAllowlist
  "REDIS_URL" = "redis://placeholder"  # Redis yok şimdilik
}
foreach ($k in $renderTarget.Keys) {
  $v = $renderTarget[$k]
  if (-not $v) { continue }
  $b = @{ value = $v } | ConvertTo-Json
  try {
    Invoke-RestMethod -Method Put -Uri "https://api.render.com/v1/services/$svcId/env-vars/$k" -Headers $rh -Body $b | Out-Null
    Log "  + $k -> Render"
  }
  catch {
    Log "  ! $k Render HATA: $($_.Exception.Message)"
  }
}

# ──────────────── 5. Render redeploy ────────────────
Log ""
Log "── 5. Render redeploy tetikle ──"
try {
  $dep = Invoke-RestMethod -Method Post -Uri "https://api.render.com/v1/services/$svcId/deploys" -Headers $rh -Body "{}"
  Log "  Deploy: $($dep.id)"
}
catch {
  Log "  Deploy HATA: $($_.Exception.Message)"
}

# ──────────────── ÖZET ────────────────
Log ""
Log "=== ÖZET ==="
Log "Lokal apps/api/.env.local: DATABASE_URL, CORS, MANAGED_*_KEY tamam"
Log "Lokal apps/web/.env.local: NEXT_PUBLIC_API_BASE_URL, APP_URL tamam"
Log "Vercel env: $($vercelTarget.Count) update"
Log "Render env: $($renderTarget.Count) update + redeploy"
Log ""
Log "Web Prod  : $vercelDomain"
Log "API Prod  : $renderApiUrl"
Log "Supabase  : $supabaseUrl"
Log ""
