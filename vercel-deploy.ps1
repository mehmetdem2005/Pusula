# Pusula Vercel deploy — repo import + env + production deploy
$ErrorActionPreference = "Continue"
$repoRoot = $PSScriptRoot
$log = Join-Path $repoRoot "vercel-deploy.log"
"=== VERCEL DEPLOY ===" | Out-File $log -Encoding utf8
function Log($m) { Write-Host $m; $m | Add-Content $log }

# tokens
$t = @{}
Get-Content (Join-Path $repoRoot "_DEVRETME_silinecek\tokens.env") | ForEach-Object {
  if ($_ -match "^([A-Z_]+)=(.*)$") { $t[$matches[1]] = $matches[2] }
}
$VT = $t["VERCEL_TOKEN"]
$GH_USER = if ($t["GITHUB_USERNAME"]) { $t["GITHUB_USERNAME"] } else { "mehmetdem2005" }
$projectRef = "zbjxkyiyqpesdpyimcmx"
$supabaseUrl = "https://$projectRef.supabase.co"

# Anon key env.local'dan oku
$webEnv = Get-Content (Join-Path $repoRoot "apps\web\.env.local") -Raw
$anonKey = ""
if ($webEnv -match "NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)") { $anonKey = $matches[1].Trim() }

$vh = @{ "Authorization" = "Bearer $VT"; "Content-Type" = "application/json" }

# ── 1. Vercel teams (Personal Account ID al) ──────────
Log "[1] Vercel user/teams..."
$me = Invoke-RestMethod -Method Get -Uri "https://api.vercel.com/v2/user" -Headers $vh
Log "User: $($me.user.username) (id=$($me.user.id))"

# ── 2. Proje var mi? ──────────────────────────────────
Log ""
Log "[2] 'pusula' projesi kontrol..."
try {
  $existing = Invoke-RestMethod -Method Get -Uri "https://api.vercel.com/v9/projects/pusula" -Headers $vh
  Log "Var: $($existing.id)"
  $projectId = $existing.id
}
catch {
  Log "Yok, olusturuluyor..."
  $body = @{
    name = "pusula"
    framework = "nextjs"
    rootDirectory = "apps/web"
    installCommand = "cd ../.. && corepack enable && pnpm install --frozen-lockfile"
    buildCommand = "cd ../.. && pnpm --filter @pusula/web build"
    outputDirectory = ".next"
    gitRepository = @{
      type = "github"
      repo = "$GH_USER/pusula"
    }
  } | ConvertTo-Json -Depth 5
  $resp = Invoke-RestMethod -Method Post -Uri "https://api.vercel.com/v10/projects" -Headers $vh -Body $body
  $projectId = $resp.id
  Log "Olusturuldu: $projectId"
}

# ── 3. Env var'lari ekle ──────────────────────────────
Log ""
Log "[3] Environment variables..."
$envs = @(
  @{ key = "NEXT_PUBLIC_SUPABASE_URL"; value = $supabaseUrl; target = @("production","preview","development"); type = "plain" },
  @{ key = "NEXT_PUBLIC_SUPABASE_ANON_KEY"; value = $anonKey; target = @("production","preview","development"); type = "encrypted" },
  @{ key = "NEXT_PUBLIC_APP_URL"; value = "https://pusula.vercel.app"; target = @("production"); type = "plain" }
)

foreach ($e in $envs) {
  $b = $e | ConvertTo-Json
  try {
    Invoke-RestMethod -Method Post -Uri "https://api.vercel.com/v10/projects/$projectId/env?upsert=true" -Headers $vh -Body $b | Out-Null
    Log "  + $($e.key)"
  }
  catch {
    Log "  ! $($e.key): $($_.Exception.Message)"
  }
}

# ── 4. Production deployment tetikle ──────────────────
Log ""
Log "[4] Production deployment..."
# Vercel git integration varsa auto-deploy zaten basladi. Manuel tetik:
$dep = @{
  name = "pusula"
  gitSource = @{
    type = "github"
    repo = "$GH_USER/pusula"
    ref = "main"
  }
  target = "production"
} | ConvertTo-Json -Depth 5
try {
  $r = Invoke-RestMethod -Method Post -Uri "https://api.vercel.com/v13/deployments" -Headers $vh -Body $dep
  Log "Deploy tetiklendi: $($r.url)"
  Log "Inspector: https://vercel.com/$GH_USER/pusula/$($r.id)"
}
catch {
  Log "Deploy HATA: $($_.Exception.Message)"
  Log "(Repo import zaten oldu, ilk push'ta auto-deploy yapilacak)"
}

Log ""
Log "=== VERCEL DEPLOY TAMAM ==="
Log "Production URL (hazir oldugunda): https://pusula.vercel.app"
Log "Build durumu: https://vercel.com/$GH_USER/pusula"
Log ""
Read-Host "Enter ile cikis"
