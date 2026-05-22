# 🧭 Pusula

> **Karar verirken kaybolma.**
> Türkiye Emlak & Oto AI Analiz Platformu

Pusula, sahibinden ve diğer ilan sitelerindeki konut, arsa ve oto ilanlarını deterministik
"kelepirlik" skoru, mahalle bağlamı ve AI açıklayıcı katmanıyla değerlendirir. Hedef kullanıcı:
emlakçılar, yatırımcılar, ilk konut alıcıları, galericiler.

> Bu monorepo, Pusula platformunun MVP iskeletini içerir. Detaylı tasarım için
> [`docs/`](./docs/) klasörünü incele — ADR, skor formülü, roadmap, pazarlama stratejisi orada.

---

## Repo Yapısı

```
pusula/
├── apps/
│   ├── web/              # Next.js 15 dashboard (app.pusula.tr)
│   ├── extension/        # Chrome Extension MV3
│   └── api/              # NestJS backend (api.pusula.tr)
├── packages/
│   ├── scoring/          # Deterministik skorlama motoru (pure TS)
│   ├── llm-gateway/      # Multi-provider LLM adapter (Groq/Gemini/DeepSeek/Anthropic)
│   ├── shared/           # Zod tipleri, sabitler, util'ler
│   └── db/               # Supabase migrations + generated types
├── docs/                 # ADR, roadmap, pazarlama stratejisi, mimari diyagramlar
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── vercel.json           # Web deploy config (Vercel)
└── tsconfig.base.json
```

---

## Geliştirme Ortamı

### Gereksinimler

- Node.js >= 20
- pnpm >= 9
- Docker (lokal Postgres + Redis)
- Chrome (extension dev için)

### İlk Kurulum

```bash
pnpm install

cp apps/web/.env.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env.local
cp apps/extension/.env.example apps/extension/.env.local

docker compose up -d         # Postgres + Redis
pnpm db:migrate              # Supabase migration (Supabase CLI gerekir)
pnpm dev                     # tüm app'ler paralel
```

## Build & Test

```bash
pnpm build
pnpm test
pnpm lint
pnpm typecheck

pnpm --filter @pusula/scoring test    # skor motoru birim testleri
pnpm --filter @pusula/web dev
pnpm --filter @pusula/api dev
pnpm --filter @pusula/extension dev
```

## Extension'ı Chrome'a Yükle (Dev Mode)

1. `pnpm --filter @pusula/extension build`
2. Chrome'da `chrome://extensions` aç
3. "Developer mode" toggle on
4. "Load unpacked" → `apps/extension/dist/`

---

## Stack Özeti

| Katman        | Teknoloji                                                                              |
| ------------- | -------------------------------------------------------------------------------------- |
| Web           | Next.js 15 (App Router) + TypeScript + Tailwind + shadcn/ui + TanStack Query + Zustand |
| Extension     | Manifest V3 + Vite + React + Tailwind                                                  |
| API           | NestJS + TypeScript + Prisma (Postgres) + BullMQ (Redis)                               |
| Auth          | Supabase Auth (email + magic link + Google OAuth)                                      |
| DB            | PostgreSQL 16 + pgvector (Supabase)                                                    |
| LLM           | `@pusula/llm-gateway` — Groq + Gemini + DeepSeek + Anthropic                           |
| Hosting       | Vercel (web) + Render (api) + Supabase (DB)                                            |
| Observability | Sentry + PostHog                                                                       |

---

## Production Deploy

Pusula üç ayrı servise dağıtılır:

| Servis                       | Hosting  | URL (beta)                | Maliyet (başlangıç)            |
| ---------------------------- | -------- | ------------------------- | ------------------------------ |
| **Web** (Next.js)            | Vercel   | `pusula-web.vercel.app`   | $0 (Hobby) → $20/ay (Pro)      |
| **API** (NestJS)             | Render   | `pusula-api.onrender.com` | $7/ay (Starter) + $10/ay Redis |
| **DB** (Postgres + pgvector) | Supabase | `xxx.supabase.co`         | $0 (Free) → $25/ay (Pro)       |

### Web — Vercel

1. [vercel.com](https://vercel.com) → New Project → GitHub repo bağla
2. Framework: **Next.js** (otomatik algılar). `vercel.json` zaten root'ta — monorepo build komutu içeriyor.
3. Region: **fra1** (Frankfurt) — Türkiye'ye en yakın
4. Environment Variables:
   - `NEXT_PUBLIC_API_BASE_URL` → `https://pusula-api.onrender.com` (Render bittikten sonra)
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_POSTHOG_KEY` (opsiyonel)
   - `NEXT_PUBLIC_SENTRY_DSN` (opsiyonel)
5. Deploy → ilk build ~2 dk

### API — Render

1. [render.com](https://render.com) → New → **Blueprint**
2. GitHub repo'yu bağla. `apps/api/render.yaml` otomatik algılanır.
3. Apply → 2 servis oluşur: `pusula-api` (web) + `pusula-redis` (redis)
4. Environment Variables (Dashboard → pusula-api → Environment):
   - `DATABASE_URL` → Supabase pooler URL (transaction mode, port 6543)
   - `REDIS_URL` → Render otomatik atar
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`
   - `SENTRY_DSN` (opsiyonel)
5. Deploy → ilk build ~5 dk
6. Health check: `https://pusula-api.onrender.com/health`

### Database — Supabase

1. [supabase.com](https://supabase.com) → New Project
2. Region: **Frankfurt (eu-central-1)** — Türkiye'ye en yakın
3. Database password kaydet
4. SQL Editor → `packages/db/migrations/0001_init.sql` içeriğini çalıştır
5. Authentication → Providers → Email + Google (opsiyonel) etkinleştir
6. Project Settings → API → `URL`, `anon` ve `service_role` key'lerini al

### Domain bağlama (gelecek — pusula.tr alındığında)

Beta'da Vercel ve Render'ın ücretsiz subdomain'leri kullanılır:

- `pusula-web.vercel.app` (web)
- `pusula-api.onrender.com` (API)

`pusula.tr` (veya `pusula.app`) alındığında:

1. **Vercel Dashboard** → Domains → `pusula.tr` ve `app.pusula.tr` ekle, DNS yönergelerini takip et
2. **Render Dashboard** → pusula-api → Custom Domain → `api.pusula.tr` ekle, CNAME ayarla
3. `.env`'lerde `NEXT_PUBLIC_API_BASE_URL` güncellenir
4. `apps/api/src/main.ts`'deki CORS regex zaten `*.pusula.tr` kapsıyor — değişiklik gerekmez

DNS sağlayıcı önerisi: **Cloudflare** (ücretsiz, hızlı, TR'de iyi cache). `.tr` için NIC.TR üzerinden domain al, Cloudflare nameserver'larına yönlendir.

### Chrome Web Store (extension)

1. `pnpm --filter @pusula/extension build` → `apps/extension/dist/` oluşur
2. `dist/` klasörünü zip'le
3. [chrome.google.com/webstore/devconsole](https://chrome.google.com/webstore/devconsole) → $5 developer fee (tek seferlik)
4. Yeni öğe → zip yükle → listing doldur (slogan + ekran görüntüleri)
5. İnceleme ~3-7 iş günü

---

## Marka

- **Ad:** Pusula
- **Slogan:** Karar verirken kaybolma.
- **Sembol:** 🧭 (pusula iğnesi — doğru yönü gösterir)
- **Renkler:** Lacivert `#0F1F4B` + Altın `#D4A22E`
- **Tipografi:** Inter (UI) + Recoleta veya Söhne (başlık)

Detaylı marka rehberi: [`docs/08-pazarlama-stratejisi.md`](./docs/08-pazarlama-stratejisi.md)

---

## Lisans

Proprietary. © 2026 Pusula. All rights reserved.
