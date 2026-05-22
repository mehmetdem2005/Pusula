# Pusula full provisioning — Supabase + GitHub + (sonra Vercel/Render)
# Host makinede calistir: powershell -ExecutionPolicy Bypass -File provision.ps1
$ErrorActionPreference = "Stop"

$repoRoot = $PSScriptRoot
$tokensFile = Join-Path $repoRoot "_DEVRETME_silinecek\tokens.env"
$log = Join-Path $repoRoot "provision.log"
"=== PUSULA PROVISION ===" | Out-File $log -Encoding utf8

function Log($m) {
  Write-Host $m
  $m | Add-Content $log
}

function LogJson($obj) {
  $s = $obj | ConvertTo-Json -Depth 10
  Write-Host $s
  $s | Add-Content $log
}

# Tokens'i oku
if (-not (Test-Path $tokensFile)) {
  Log "tokens.env yok: $tokensFile"
  exit 1
}
$tokens = @{}
Get-Content $tokensFile | ForEach-Object {
  if ($_ -match "^([A-Z_]+)=(.*)$") {
    $tokens[$matches[1]] = $matches[2]
  }
}

$SUPABASE_PAT = $tokens["SUPABASE_ACCESS_TOKEN"]
$GH_TOKEN = $tokens["GITHUB_TOKEN"]
$GH_USER = $tokens["GITHUB_USERNAME"]

if (-not $SUPABASE_PAT) { Log "SUPABASE_ACCESS_TOKEN yok"; exit 1 }
if (-not $GH_TOKEN) { Log "GITHUB_TOKEN yok"; exit 1 }

$supabaseHeaders = @{ "Authorization" = "Bearer $SUPABASE_PAT"; "Content-Type" = "application/json" }
$ghHeaders = @{ "Authorization" = "Bearer $GH_TOKEN"; "Accept" = "application/vnd.github+json"; "X-GitHub-Api-Version" = "2022-11-28"; "User-Agent" = "pusula-provision" }

# ─────────────────────────────────────────────────────────
# 1. SUPABASE: organizations
# ─────────────────────────────────────────────────────────
Log ""
Log "[1] Supabase organizations..."
$orgs = Invoke-RestMethod -Method Get -Uri "https://api.supabase.com/v1/organizations" -Headers $supabaseHeaders
LogJson $orgs
if ($orgs.Count -eq 0) {
  Log "Hicbir organizasyon yok. Supabase Dashboard'da bir kez login ol."
  exit 1
}
$orgId = $orgs[0].id
$orgSlug = $orgs[0].slug
Log "Secilen org: $orgSlug (id=$orgId)"

# ─────────────────────────────────────────────────────────
# 2. SUPABASE: proje var mı? Yoksa olustur.
# ─────────────────────────────────────────────────────────
Log ""
Log "[2] Mevcut projeler..."
$projects = Invoke-RestMethod -Method Get -Uri "https://api.supabase.com/v1/projects" -Headers $supabaseHeaders
$existing = $projects | Where-Object { $_.name -eq "pusula" }

if ($existing) {
  Log "Var olan 'pusula' projesi bulundu: ref=$($existing.id)"
  $projectRef = $existing.id
}
else {
  Log "Yeni 'pusula' projesi olusturuluyor (Frankfurt, eu-central-1)..."
  $dbPass = -join ((1..32) | ForEach-Object { [char[]]"ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789" | Get-Random })
  Log "DB password (sakla): $dbPass"
  $dbPass | Add-Content $tokensFile
  ("SUPABASE_DB_PASSWORD=" + $dbPass) | Add-Content $tokensFile

  $body = @{
    name = "pusula"
    organization_id = $orgId
    region = "eu-central-1"
    db_pass = $dbPass
    plan = "free"
  } | ConvertTo-Json

  $resp = Invoke-RestMethod -Method Post -Uri "https://api.supabase.com/v1/projects" -Headers $supabaseHeaders -Body $body
  LogJson $resp
  $projectRef = $resp.id
  Log "Olusturuldu: ref=$projectRef"

  Log "Proje hazirlanana kadar bekleniyor (~60-120 sn)..."
  $maxWait = 180
  $elapsed = 0
  while ($elapsed -lt $maxWait) {
    Start-Sleep -Seconds 5
    $elapsed += 5
    try {
      $p = Invoke-RestMethod -Method Get -Uri "https://api.supabase.com/v1/projects/$projectRef" -Headers $supabaseHeaders
      Log ("  $elapsed sn - status: " + $p.status)
      if ($p.status -eq "ACTIVE_HEALTHY") { break }
    }
    catch {
      Log ("  $elapsed sn - bekleme: " + $_.Exception.Message)
    }
  }
}

# ─────────────────────────────────────────────────────────
# 3. SUPABASE: API keys cek
# ─────────────────────────────────────────────────────────
Log ""
Log "[3] API keys aliniyor..."
$keys = Invoke-RestMethod -Method Get -Uri "https://api.supabase.com/v1/projects/$projectRef/api-keys" -Headers $supabaseHeaders
$anonKey = ($keys | Where-Object { $_.name -eq "anon" }).api_key
$srKey = ($keys | Where-Object { $_.name -eq "service_role" }).api_key

$supabaseUrl = "https://$projectRef.supabase.co"
Log "URL: $supabaseUrl"
Log "anon: $($anonKey.Substring(0,15))..."
Log "service_role: $($srKey.Substring(0,15))..."

# JWT secret
$cfg = Invoke-RestMethod -Method Get -Uri "https://api.supabase.com/v1/projects/$projectRef/config/auth" -Headers $supabaseHeaders -ErrorAction SilentlyContinue
$jwtSecret = if ($cfg) { $cfg.jwt_secret } else { "" }

# ─────────────────────────────────────────────────────────
# 4. SUPABASE: migration'lari calistir
# ─────────────────────────────────────────────────────────
Log ""
Log "[4] Migrationlari calistir..."
foreach ($file in @("packages\db\migrations\0001_init.sql", "packages\db\migrations\0002_hardening.sql")) {
  $path = Join-Path $repoRoot $file
  if (-not (Test-Path $path)) { Log "Atlandi (yok): $file"; continue }
  $sql = Get-Content $path -Raw
  $body = @{ query = $sql } | ConvertTo-Json
  try {
    $r = Invoke-RestMethod -Method Post -Uri "https://api.supabase.com/v1/projects/$projectRef/database/query" -Headers $supabaseHeaders -Body $body
    Log "OK: $file"
  }
  catch {
    Log ("HATA $file : " + $_.Exception.Message)
  }
}

# ─────────────────────────────────────────────────────────
# 5. env.local dosyalarini yaz
# ─────────────────────────────────────────────────────────
Log ""
Log "[5] env.local dosyalari yaziliyor..."

$webEnv = @"
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
NEXT_PUBLIC_SUPABASE_URL=$supabaseUrl
NEXT_PUBLIC_SUPABASE_ANON_KEY=$anonKey
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
NEXT_PUBLIC_SENTRY_DSN=
NEXT_PUBLIC_APP_URL=http://localhost:3000
"@
$webEnv | Out-File (Join-Path $repoRoot "apps\web\.env.local") -Encoding utf8 -NoNewline
Log "apps/web/.env.local yazildi"

$apiEnv = @"
NODE_ENV=development
PORT=3001
LOG_LEVEL=info
APP_VERSION=0.0.1
DATABASE_URL=postgresql://pusula:pusula_dev@localhost:5432/pusula_dev
REDIS_URL=redis://localhost:6379
SUPABASE_URL=$supabaseUrl
SUPABASE_ANON_KEY=$anonKey
SUPABASE_SERVICE_ROLE_KEY=$srKey
SUPABASE_JWT_SECRET=$jwtSecret
CORS_ALLOWED_ORIGINS=http://localhost:3000
EXT_IDS=
SENTRY_DSN=
OTEL_EXPORTER_OTLP_ENDPOINT=
OTEL_SERVICE_NAME=pusula-api
POSTHOG_KEY=
THROTTLE_TTL_MS=60000
THROTTLE_LIMIT=60
THROTTLE_LLM_LIMIT=20
"@
$apiEnv | Out-File (Join-Path $repoRoot "apps\api\.env.local") -Encoding utf8 -NoNewline
Log "apps/api/.env.local yazildi"

# ─────────────────────────────────────────────────────────
# 6. GitHub: user info
# ─────────────────────────────────────────────────────────
Log ""
Log "[6] GitHub user info..."
$ghMe = Invoke-RestMethod -Method Get -Uri "https://api.github.com/user" -Headers $ghHeaders
$ghUser = $ghMe.login
Log "GitHub user: $ghUser"
if (-not $GH_USER) {
  $GH_USER = $ghUser
  ("GITHUB_USERNAME=" + $ghUser) | Add-Content $tokensFile
}

# ─────────────────────────────────────────────────────────
# 7. GitHub: repo var mi? Yoksa olustur.
# ─────────────────────────────────────────────────────────
Log ""
Log "[7] GitHub repo 'pusula' kontrol..."
$repoExists = $false
try {
  $r = Invoke-RestMethod -Method Get -Uri "https://api.github.com/repos/$ghUser/pusula" -Headers $ghHeaders -ErrorAction Stop
  $repoExists = $true
  Log "Var olan repo: $($r.html_url)"
}
catch {
  Log "Repo yok, olusturuluyor..."
  $body = @{
    name = "pusula"
    description = "Pusula - Karar verirken kaybolma"
    private = $true
    has_issues = $true
    has_projects = $false
    has_wiki = $false
    auto_init = $false
  } | ConvertTo-Json
  $r = Invoke-RestMethod -Method Post -Uri "https://api.github.com/user/repos" -Headers $ghHeaders -Body $body
  Log "Olusturuldu: $($r.html_url)"
}

# ─────────────────────────────────────────────────────────
# 8. GitHub: kodu push
# ─────────────────────────────────────────────────────────
Log ""
Log "[8] Git init + commit + push..."
Set-Location $repoRoot

if (-not (Test-Path ".git")) {
  git init 2>&1 | ForEach-Object { Log $_ }
  git branch -M main 2>&1 | ForEach-Object { Log $_ }
}
git config user.email "$ghUser@users.noreply.github.com" 2>&1 | Out-Null
git config user.name $ghUser 2>&1 | Out-Null
git add -A 2>&1 | Out-Null
$commitOut = git commit -m "chore: pusula initial commit" 2>&1
Log $commitOut

$remoteUrl = "https://${GH_TOKEN}@github.com/$ghUser/pusula.git"
git remote remove origin 2>&1 | Out-Null
git remote add origin $remoteUrl 2>&1 | Out-Null
git push -u origin main 2>&1 | ForEach-Object { Log $_ }

# ─────────────────────────────────────────────────────────
# 9. GitHub Secrets
# ─────────────────────────────────────────────────────────
Log ""
Log "[9] GitHub Secrets ekle..."

function Set-GhSecret($name, $value) {
  if (-not $value) { Log "  Atlandi (bos): $name"; return }
  # Public key al
  $pk = Invoke-RestMethod -Method Get -Uri "https://api.github.com/repos/$ghUser/pusula/actions/secrets/public-key" -Headers $ghHeaders
  # libsodium sealed box C# wrapper yok PowerShell'de — basit base64 plaintext (PoC)
  # Ger�ek prod: bunu sodium ile sifrele. Su an manuel uyari ver.
  Log "  Manuel ekle: $name (github.com/$ghUser/pusula/settings/secrets/actions)"
}

foreach ($k in @("SUPABASE_URL","SUPABASE_ANON_KEY","SUPABASE_SERVICE_ROLE_KEY","SUPABASE_JWT_SECRET","VERCEL_TOKEN","RENDER_API_KEY","GROQ_API_KEY","GEMINI_API_KEY","DEEPSEEK_API_KEY","ANTHROPIC_API_KEY")) {
  $v = switch ($k) {
    "SUPABASE_URL" { $supabaseUrl }
    "SUPABASE_ANON_KEY" { $anonKey }
    "SUPABASE_SERVICE_ROLE_KEY" { $srKey }
    "SUPABASE_JWT_SECRET" { $jwtSecret }
    default { $tokens[$k] }
  }
  Set-GhSecret $k $v
}

# ─────────────────────────────────────────────────────────
# 10. Web dev'i restart icin uyari
# ─────────────────────────────────────────────────────────
Log ""
Log "=== PROVISIONING TAMAM ==="
Log ""
Log "Sonraki adim:"
Log "  1. Calisan web dev sunucusunu (PowerShell penceresi) Ctrl+C ile durdur"
Log "  2. pusula-web-only-ps.ps1'i tekrar calistir (yeni env.local ile)"
Log "  3. http://localhost:3000/auth/signup -> email ver -> magic link gercekten gelir"
Log ""
Log "Repo: https://github.com/$ghUser/pusula"
Log "Supabase: $supabaseUrl"
Log ""
Read-Host "Enter ile cikis"
