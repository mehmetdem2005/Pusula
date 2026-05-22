# 🧭 Pusula — Geliştirici Quickstart

> "Karar verirken kaybolma" — kendi makinende 5 dakikada açmak için.

## Önkoşullar

- **Node 20+** ([.nvmrc](.nvmrc) okuyor — `nvm use` ile otomatik)
- **pnpm 9+** (yoksa `corepack enable && corepack prepare pnpm@9.14.4 --activate`)
- **Docker** (Postgres 16 + Redis 7 için)
- **Chrome** (Extension MV3 testi için)
- **Supabase hesabı** (free tier yeter) — sadece API tam çalışsın diye

## Hızlı Komut

```bash
bash scripts/quickstart.sh
```

Bu betik:
1. Node/pnpm/Docker varlığını kontrol eder
2. `apps/*/.env.local` dosyalarını `.env.example`'dan kopyalar
3. `pnpm install` çalıştırır
4. `docker compose up -d` ile Postgres + Redis ayağa kalkar
5. Supabase env'i hâlâ varsayılansa uyarı verir
6. Dev sunucu komutlarını yazar

## Manuel Adım Adım

```bash
# 1. Bağımlılıklar
pnpm install

# 2. Env dosyaları
cp apps/api/.env.example apps/api/.env.local
cp apps/web/.env.example apps/web/.env.local
cp apps/extension/.env.example apps/extension/.env.local

# 3. Postgres + Redis
docker compose up -d

# 4. Supabase (zorunlu — API ayağa kalkması için)
#    a. supabase.com → New project (Frankfurt önerilen)
#    b. Settings > API → URL ve anon key'i kopyala
#    c. Settings > API → service_role key'i kopyala (gizli tut)
#    d. SQL Editor → packages/db/migrations/0001_init.sql çalıştır
#    e. SQL Editor → packages/db/migrations/0002_hardening.sql çalıştır
#    f. apps/api/.env.local'a SUPABASE_URL/ANON_KEY/SERVICE_ROLE_KEY/JWT_SECRET yapıştır
#    g. apps/web/.env.local'a NEXT_PUBLIC_SUPABASE_URL ve _ANON_KEY yapıştır

# 5. Dev (3 terminal veya tek paralel)
pnpm dev
# veya
pnpm --filter @pusula/web dev      # http://localhost:3000
pnpm --filter @pusula/api dev      # http://localhost:3001
pnpm --filter @pusula/extension dev # apps/extension/dist
```

## Extension'ı Chrome'a Yükle

1. `pnpm --filter @pusula/extension build`
2. Chrome → `chrome://extensions`
3. Sağ üstte **Developer mode** açık
4. **Load unpacked** → `apps/extension/dist/` klasörünü seç
5. Pusula simgesi araç çubuğunda belirir; sahibinden.com/ilan/* sayfasında otomatik tetiklenir

## Şu An Erişebileceğin Sayfalar

| URL | Durum |
|---|---|
| `http://localhost:3000` | ✅ Landing |
| `/auth/login` | ✅ Magic link UI (stub, gerçek auth V1) |
| `/auth/signup` | ✅ Beta kayıt UI (stub) |
| `/dashboard` | ✅ Boş hâliyle "Henüz ilan yok" |
| `/ilan/[id]` | ✅ İskelet — gerçek veri V1 |
| `/settings` | ✅ BYOK provider UI (input'lar çalışıyor, save V1) |
| `/legal/kvkk` | ✅ Statik metin |
| `/legal/kullanim` | ✅ Statik metin |
| `/error`, `/loading`, `/not-found` | ✅ Hazır |

## API Endpoint'leri

| URL | Auth | Durum |
|---|---|---|
| `GET /health`, `/healthz` | yok | ✅ Liveness |
| `GET /v1/readyz` | yok | ✅ DB + Redis check |
| `POST /v1/ilanlar/ingest` | JWT | ✅ Skor + persistans |
| `POST /v1/ilanlar/list-batch` | JWT | ✅ Validation, queue (V1) |
| `POST /v1/llm/chat` | JWT | ✅ BYOK proxy |
| `POST /v1/telemetry/parser-error` | JWT | ✅ Parse hata logu |

## Sorun Giderme

- **API başlamıyor:** `apps/api/.env.local`'da `SUPABASE_URL/SERVICE_ROLE_KEY/JWT_SECRET` boş olmamalı. EnvSchema fail-fast eder.
- **Port çakışması:** `PORT=3002 pnpm --filter @pusula/api dev`
- **Docker container'ları çakışıyor:** `docker compose down -v` (volume sıfırlar)
- **pnpm install yavaş:** `pnpm install --prefer-offline`
- **Extension yüklenmiyor:** `apps/extension/dist/` boşsa `pnpm --filter @pusula/extension build`
- **CORS hatası:** `apps/api/.env.local`'da `CORS_ALLOWED_ORIGINS=http://localhost:3000` olduğundan emin ol

## Şu An Stub Olanlar (V1'de Dolacak)

- Supabase magic link gerçek bağlantısı (login/signup UI mock)
- AI sohbet (extension sidepanel) — gerçek LLM çağrısı backend'e bağlı ama UI placeholder
- Specialist agent'lar (Vision/NLP/Negotiation/Marketing) — stub döner
- Dashboard ilan listesi — boş state; gerçek query V1
- BullMQ worker dyno — ayrı process olarak başlatılmadı (kodu hazır)

Detay: `docs/09-proje-denetim-raporu.md` §12-13.
