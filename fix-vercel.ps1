$ErrorActionPreference = "Continue"
$repoRoot = $PSScriptRoot
$log = Join-Path $repoRoot "fix-vercel.log"
function Log($m) { Write-Host $m; Add-Content $log -Value $m }
Remove-Item $log -ErrorAction SilentlyContinue
"" | Out-File $log -Encoding utf8

$t = @{}
Get-Content (Join-Path $repoRoot "_DEVRETME_silinecek\tokens.env") | ForEach-Object {
  if ($_ -match "^([A-Z_]+)=(.*)$") { $t[$matches[1]] = $matches[2] }
}
$VT = $t["VERCEL_TOKEN"]
$vh = @{ "Authorization" = "Bearer $VT"; "Content-Type" = "application/json" }

# Mevcut ayarları kontrol
$proj = Invoke-RestMethod -Method Get -Uri "https://api.vercel.com/v9/projects/pusula" -Headers $vh
Log "Mevcut rootDirectory: $($proj.rootDirectory)"
Log "Mevcut framework: $($proj.framework)"
Log "Mevcut buildCommand: $($proj.buildCommand)"
Log "Mevcut installCommand: $($proj.installCommand)"

# Düzelt
$update = @{
  framework = "nextjs"
  rootDirectory = "apps/web"
  buildCommand = "cd ../.. && pnpm install --frozen-lockfile=false && pnpm --filter @pusula/web build"
  installCommand = "cd ../.. && corepack enable && pnpm install --frozen-lockfile=false"
  outputDirectory = ".next"
  nodeVersion = "20.x"
} | ConvertTo-Json

Log ""
Log "PATCH ile düzeltiliyor..."
$r = Invoke-RestMethod -Method Patch -Uri "https://api.vercel.com/v9/projects/pusula" -Headers $vh -Body $update
Log "Yeni rootDirectory: $($r.rootDirectory)"
Log "Yeni framework: $($r.framework)"
Log "Yeni buildCommand: $($r.buildCommand)"

# Yeni deployment tetikle
Log ""
Log "Yeniden deploy tetikleniyor..."
$dep = @{
  name = "pusula"
  gitSource = @{ type = "github"; repo = "mehmetdem2005/Pusula"; ref = "main" }
  target = "production"
  projectSettings = @{ rootDirectory = "apps/web"; framework = "nextjs" }
} | ConvertTo-Json -Depth 5
try {
  $d = Invoke-RestMethod -Method Post -Uri "https://api.vercel.com/v13/deployments" -Headers $vh -Body $dep
  Log "Deploy: $($d.url)"
  Log "Inspector: $($d.inspectorUrl)"
}
catch {
  Log "Deploy HATA: $($_.Exception.Message)"
  $errBody = $_.ErrorDetails.Message
  if ($errBody) { Log "Detay: $errBody" }
}

Log ""
Log "─── RENDER KONTROL ───"
$RT = $t["RENDER_API_KEY"]
$rh = @{ "Authorization" = "Bearer $RT"; "Accept" = "application/json" }
$svc = (Invoke-RestMethod -Method Get -Uri "https://api.render.com/v1/services?name=pusula-api&limit=5" -Headers $rh | Where-Object { $_.service.name -eq "pusula-api" } | Select-Object -First 1).service
$svcId = $svc.id
Log "Render service: $svcId"
$ld = (Invoke-RestMethod -Method Get -Uri "https://api.render.com/v1/services/$svcId/deploys?limit=1" -Headers $rh)[0].deploy
Log "Son deploy: $($ld.id) — Status: $($ld.status)"
if ($ld.status -match "fail|error|canceled") {
  $events = Invoke-RestMethod -Method Get -Uri "https://api.render.com/v1/services/$svcId/events?limit=10" -Headers $rh
  foreach ($e in $events) {
    if ($e.event.details.reason -or $e.event.type -match "fail|deploy") {
      Log "  $($e.event.type): $($e.event.details | ConvertTo-Json -Compress)"
    }
  }
}
