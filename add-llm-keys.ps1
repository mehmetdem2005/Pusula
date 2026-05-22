# LLM key'leri Render service + Vercel project + lokal API .env.local'a ekle
$ErrorActionPreference = "Continue"
$repoRoot = $PSScriptRoot
$log = Join-Path $repoRoot "add-llm.log"
"=== ADD LLM ===" | Out-File $log -Encoding utf8
function Log($m) { Write-Host $m; $m | Add-Content $log }

$t = @{}
Get-Content (Join-Path $repoRoot "_DEVRETME_silinecek\tokens.env") | ForEach-Object {
  if ($_ -match "^([A-Z_]+)=(.*)$") { $t[$matches[1]] = $matches[2] }
}
$RT = $t["RENDER_API_KEY"]
$VT = $t["VERCEL_TOKEN"]
$rh = @{ "Authorization" = "Bearer $RT"; "Content-Type" = "application/json"; "Accept" = "application/json" }
$vh = @{ "Authorization" = "Bearer $VT"; "Content-Type" = "application/json" }

$keys = @{
  "MANAGED_GROQ_KEY"      = $t["GROQ_API_KEY"]
  "MANAGED_GEMINI_KEY"    = $t["GEMINI_API_KEY"]
  "MANAGED_DEEPSEEK_KEY"  = $t["DEEPSEEK_API_KEY"]
  "MANAGED_ANTHROPIC_KEY" = $t["ANTHROPIC_API_KEY"]
}

# ── 1. Render env'ye ekle ───────────────────────────
Log "[1] Render env vars..."
$services = Invoke-RestMethod -Method Get -Uri "https://api.render.com/v1/services?name=pusula-api&limit=5" -Headers $rh
$svcId = ($services | Where-Object { $_.service.name -eq "pusula-api" } | Select-Object -First 1).service.id
Log "Service ID: $svcId"

foreach ($k in $keys.Keys) {
  $v = $keys[$k]
  if (-not $v) { Log "  - $k bos, atlandi"; continue }
  $b = @{ value = $v } | ConvertTo-Json
  try {
    Invoke-RestMethod -Method Put -Uri "https://api.render.com/v1/services/$svcId/env-vars/$k" -Headers $rh -Body $b | Out-Null
    Log "  + $k -> Render"
  }
  catch {
    Log "  ! $k Render HATA: $($_.Exception.Message)"
  }
}

# ── 2. Vercel env'ye ekle (server-only, NEXT_PUBLIC degil) ──
Log ""
Log "[2] Vercel env vars (server-side)..."
$projInfo = Invoke-RestMethod -Method Get -Uri "https://api.vercel.com/v9/projects/pusula" -Headers $vh
$projectId = $projInfo.id
Log "Vercel project: $projectId"

foreach ($k in $keys.Keys) {
  $v = $keys[$k]
  if (-not $v) { continue }
  $b = @{
    key = $k
    value = $v
    target = @("production","preview","development")
    type = "encrypted"
  } | ConvertTo-Json
  try {
    Invoke-RestMethod -Method Post -Uri "https://api.vercel.com/v10/projects/$projectId/env?upsert=true" -Headers $vh -Body $b | Out-Null
    Log "  + $k -> Vercel"
  }
  catch {
    Log "  ! $k Vercel HATA: $($_.Exception.Message)"
  }
}

# ── 3. Lokal apps/api/.env.local'a ekle ─────────────
Log ""
Log "[3] Lokal apps/api/.env.local..."
$apiEnvPath = Join-Path $repoRoot "apps\api\.env.local"
$content = Get-Content $apiEnvPath -Raw
foreach ($k in $keys.Keys) {
  $v = $keys[$k]
  if (-not $v) { continue }
  if ($content -match "(?m)^$k=") {
    $content = $content -replace "(?m)^$k=.*$", "$k=$v"
  } else {
    $content = $content.TrimEnd() + "`n$k=$v"
  }
  Log "  + $k -> apps/api/.env.local"
}
$content | Out-File $apiEnvPath -Encoding utf8 -NoNewline

# ── 4. Render service'i redeploy tetikle (env degisikligi sonra) ────
Log ""
Log "[4] Render redeploy tetikle..."
try {
  $dep = Invoke-RestMethod -Method Post -Uri "https://api.render.com/v1/services/$svcId/deploys" -Headers $rh -Body "{}"
  Log "Deploy: $($dep.id)"
}
catch {
  Log "Deploy auto-trigger: $($_.Exception.Message)"
}

Log ""
Log "=== TAMAM ==="
Log "Render env'sine eklendi, redeploy tetiklendi"
Log "Vercel env'sine eklendi (NEXT_PUBLIC degil — server-only)"
Log "Lokal apps/api/.env.local guncellendi"
Log ""
Read-Host "Enter ile cikis"
