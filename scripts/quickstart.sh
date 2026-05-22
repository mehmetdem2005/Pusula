#!/usr/bin/env bash
set -e

# ─── Pusula — 5 dakikada lokalde ayağa kaldırma ─────────────────────────
# Kullanım: bash scripts/quickstart.sh
# ────────────────────────────────────────────────────────────────────────

cyan() { printf "\033[36m%s\033[0m\n" "$*"; }
green() { printf "\033[32m✓ %s\033[0m\n" "$*"; }
yellow() { printf "\033[33m! %s\033[0m\n" "$*"; }
red() { printf "\033[31m✗ %s\033[0m\n" "$*"; }

cyan "🧭 Pusula Quickstart — 5 dk lokal kurulum"
echo

cyan "1/6  Gereksinimleri kontrol ediyoruz…"
command -v node >/dev/null 2>&1 || { red "Node bulunamadı. https://nodejs.org → 20.x"; exit 1; }
NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]")
if [ "$NODE_MAJOR" -lt 20 ]; then
  red "Node sürümü < 20. Yüklü: $(node -v)"; exit 1
fi
command -v pnpm >/dev/null 2>&1 || {
  yellow "pnpm yok — corepack ile yüklüyoruz…"
  corepack enable && corepack prepare pnpm@9.14.4 --activate
}
command -v docker >/dev/null 2>&1 || { red "Docker bulunamadı. https://docker.com"; exit 1; }
green "Node $(node -v), pnpm $(pnpm -v), Docker hazır."

cyan "2/6  .env.local dosyaları…"
for app in api web extension; do
  src="apps/$app/.env.example"
  dst="apps/$app/.env.local"
  if [ ! -f "$dst" ] && [ -f "$src" ]; then
    cp "$src" "$dst"
    green "Oluşturuldu: $dst"
  else
    yellow "Mevcut: $dst"
  fi
done

cyan "3/6  Bağımlılıkları yüklüyoruz…"
pnpm install --frozen-lockfile 2>/dev/null || pnpm install

cyan "4/6  Docker servisleri (Postgres + Redis)…"
docker compose up -d
sleep 2
docker compose ps

cyan "5/6  Env doğrulama hatırlatma…"
if grep -q "your-project.supabase.co" apps/api/.env.local 2>/dev/null; then
  yellow "Supabase URL hâlâ varsayılan. Adımlar:"
  yellow "  1. https://supabase.com → yeni proje (Frankfurt)"
  yellow "  2. apps/api/.env.local + apps/web/.env.local içinde Supabase URL/key'leri doldur"
  yellow "  3. SQL Editor → packages/db/migrations/0001_init.sql + 0002_hardening.sql"
fi

cyan "6/6  Dev sunucu komutları:"
echo "  pnpm dev                                  # Hepsi paralel"
echo "  pnpm --filter @pusula/web dev             # Sadece web   → http://localhost:3000"
echo "  pnpm --filter @pusula/api dev             # Sadece API   → http://localhost:3001"
echo "  pnpm --filter @pusula/extension dev       # Extension build (apps/extension/dist)"
echo
green "Quickstart tamamlandı."
