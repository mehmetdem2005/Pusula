# Sprint 7 — Web Parity + iPad Pencil + Realtime

> Mobile-first ama Türk akademik kullanıcı bilgisayardan PDF açar.
> Web full feature parity + Supabase Realtime multi-device sync + iPad Apple Pencil.

## 6 sistem teslim edildi

### 1. Web Auth + Layout
- **`middleware.ts`** — Supabase SSR middleware, korumalı route guard, login redirect
- **`lib/supabase/server.ts`** + **`client.ts`** — SSR cookie-based + browser singleton
- **`lib/api.ts`** — fetch wrapper auto auth header
- **`(app)/layout.tsx`** — Sidebar nav (collapsible 240px → 64px), localStorage persist
- **`OnlineIndicator.tsx`** — Çevrimiçi/dışı dot indicator
- **`/login`** + **`/signup`** + **`/auth/callback`** — Magic link + password + Google OAuth

### 2. Web TanStack Query + Offline-first
- **`query-provider.tsx`** — PersistQueryClientProvider with localStorage
- **gcTime 24 saat**, throttle 1sn, schema bust 'v1'
- **maxAge 24 saat persist** — Tab kapatılınca bile cache duruyor
- 401/403 retry yok, diğer hatalar 2 retry

### 3. Web Notebook 3-Panel Split
- **`(app)/notebooks/[id]/page.tsx`** — 3 sütun: Sources (320px) + Chat (flex) + Studio (384px)
- **`SourcesPanel.tsx`** — Drag-drop upload, multi-file, doğrudan Supabase Storage upload
  - 5 source type: file, url, youtube (3 input formu)
  - PDF/EPUB/audio mime detection
  - Status indicator (pending/processing/ready, animated pulse)
- **`ChatPanel.tsx`** — Optimistic UI, ReactMarkdown + remark-gfm, citation cards inline
  - Empty state suggestion chips (5 öneri)
  - ⏎ gönder, ⇧⏎ yeni satır
  - Auto-scroll on new messages
  - `[[1]]` markerlar `[1]` code-style render
- **`StudioPanel.tsx`** — 6 type quick-generate (audio_overview Pro, summary, flashcards, quiz, slides, infographic)

### 4. Realtime Multi-Device Sync
- **`useNotebookRealtime.ts`** hook — Supabase Realtime channel subscribe
- **3 channel listener:**
  - `notebook_sources` * → Source işlenince web/mobile push
  - `notebook_messages` INSERT → Mobile'dan mesaj gelirse web anında görür
  - `generated_content` UPDATE → Podcast hazır olunca push
- **`useClanRealtime.ts`** — Clan chat real-time
- **Pattern:** invalidateQueries on event (TanStack Query refetch); optimistic UI bozulmaz

### 5. Public Web Pages (SEO + ISR)
- **`/n/[slug]`** — Server-rendered, ISR 60sn revalidate, OpenGraph + Twitter Card meta
- **`/u/[username]`** — Server-rendered profile, ISR 120sn, achievement showcase
- **`/gallery`** — Client-side keşfet, kategori + sort filter
- **`/clans`** — Mine + Discover tab
- **`/leaderboard`** — Weekly/monthly + "Senin Yerin" amber banner
- **`/achievements`** — 5 kategori, 4 rarity tier (border-color encoded)

### 6. iPad Apple Pencil + Handwriting OCR
- **`HandwritingCanvas.tsx`** — `@shopify/react-native-skia` 1.5.0
  - Skia Path API, basınç-duyarlı (force) çizim
  - 5 renk × 4 kalın seçimi
  - Undo + clear actions
  - `runOnJS` worklet dispatcher (UI thread'de path drawing)
- **`HandwritingModal.tsx`** — 3 mode tab: Metin / Matematik / Karışık
  - Snapshot → base64 PNG → OCR
  - 2sn typical recognition
- **`routes/handwriting.ts`** — Gemini 2.0 Flash Vision OCR
  - 3 prompt template (text/math/mixed)
  - Math mode → LaTeX output
  - Mixed mode → Markdown with $...$ math delimiters

## Mimari Kararlar (Sprint 7)

### Web 3-panel layout (NotebookLM-vari)
Mobile mecbur tab navigation — küçük ekran. Web'de aynı anda Sources + Chat + Studio görmek için 3-panel split. NotebookLM, Cursor, VSCode'dan esinli. Modal yok, context kayıp olmuyor.

### Realtime channel sadece **postgres_changes**
Custom broadcast channel gerekmeli mi? Hayır. Postgres Realtime publication zaten Sprint 6'da migration'a girmiş. RLS-aware filtering zaten Postgres'te. Custom broadcast = ekstra complexity.

### Drag-drop direkt Supabase Storage'a, sonra backend'e bildiri
Eskiden multipart POST → backend → Storage idi. Şimdi:
1. Browser direkt Storage upload (fast, paralel)
2. Backend'e sadece path bildiriliyor
3. Backend processSource queue'ya alıyor

Avantajlar: Daha hızlı (browser ↔ Storage CDN), backend memory kurtuluyor (5MB+ PDF'ler), büyük dosya destekliyor.

### Server Components + ISR for public pages
`/n/[slug]` ve `/u/[username]` server-rendered + 60-120sn revalidate. Sebep:
- SEO için tam HTML render
- OpenGraph image preview WhatsApp/Twitter'da
- Cache hit oranı yüksek (galeri'de viral defter 100x ziyaret edilir, hep aynı)
- Login optional, anonim erişim destekli

### Apple Pencil → Skia (Canvas API yerine)
react-native-svg ile çizim mümkün ama:
- Performance: 1000+ point path'de SVG donar, Skia 60fps
- Basınç (force): Apple Pencil pressure değerleri Skia'da native
- Snapshot API: Canvas → base64 PNG export ücretsiz
- Reanimated worklet uyumlu: çizgi UI thread'de

### Math mode → LaTeX, mixed → Markdown+LaTeX
ChatGPT/Claude formatına uyumlu. ReactMarkdown'da KaTeX render edilebilir (gelecek sprint). Şimdilik raw output, kullanıcı kopyalayıp Notion/Obsidian'a atabilir.

### Web side-effect: Auth state listener auto-redirect
`onAuthStateChange` ile session kaybolursa `/login`'e otomatik redirect. Multi-tab support: bir tab'da çıkış yaparsan diğer tab'lar da otomatik logout.

### Public page'lerde sidebar yok
`/n/[slug]` ve `/u/[username]` `(app)/layout` altında değil. Anonim ziyaretçi için minimal nav (Kavra logo + Giriş + Keşfet). Conversion için en sade akış.

## Maliyet (1000 Pro user/ay)

| Servis | Aylık |
|---|---|
| Sprint 6 baseline | $992-1342 |
| Render Standard web service | $25 |
| Vercel alt-plan (eğer Vercel'e taşınırsa) | $20 |
| Supabase Realtime channels (concurrent) | $0 (Free tier 200 concurrent) |
| Gemini Vision OCR (~%5 user kullanır) | $5 |
| **Sprint 7 ek** | **$30** |
| **Toplam** | **~$1022-1372** |

## Yeni Env

```bash
# Web (Next.js)
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_API_BASE_URL=https://api.kavra.app
```

## Yeni Deps

```json
// apps/web/package.json
"@tanstack/react-query": "^5.62.0",
"@tanstack/react-query-persist-client": "^5.62.0",
"@tanstack/query-async-storage-persister": "^5.62.0",
"@tailwindcss/typography": "^0.5.15",
"react-pdf": "^9.2.1",
"sonner": "^1.7.0",
"lucide-react": "^0.475.0",
"react-markdown": "^9.0.1",
"remark-gfm": "^4.0.0",
"mermaid": "^11.4.1"

// apps/mobile/package.json
"@shopify/react-native-skia": "1.5.0"
```

## Sanity

- Toplam dosya: **416**
- Yeni: 25 dosya (4 backend + 16 web + 5 mobile)
- API endpoints: 1 yeni (`/api/handwriting/recognize`)
- Web routes: 14 yeni
- Mobile component: 2 yeni (Handwriting)
- Realtime channels: 2 (notebook + clan)
- Cron job: 1 yeni (leaderboard-refresh hourly)

## Web Route Yapısı

```
/                          # Landing (mevcut)
/login + /signup           # Auth
/auth/callback             # OAuth + magic link redirect
/privacy + /terms          # GDPR
/n/[slug]                  # Public notebook (anonim)
/u/[username]              # Public profile (anonim)
/admin/*                   # Admin (mevcut)

(app) — auth-required:
/library                   # Defterlerim grid
/notebooks/[id]            # 3-panel notebook detay
/notebooks/new             # (gelecekte)
/gallery                   # Keşfet
/leaderboard               # Liderlik
/achievements              # Rozetler
/clans                     # Klanlar
/clans/[slug]              # Klan detay (gelecekte)
/settings                  # (gelecekte)
```

## Test Akışları

### Web first-time user
1. `kavra.app` → Landing → "Kayıt Ol"
2. Email + şifre + ad → onay maili
3. `/library` boş state → "İlk defterini oluştur"
4. PDF sürükle-bırak → upload progress → status: ready
5. Chat'e "Bu makaleyi özetle" → 2-3sn'de cevap + 5 citation
6. Studio'dan "Sesli Özet" tıkla → "Üretiliyor..." → 60sn sonra hazır
7. Realtime: Telefonunda mobile app'i aç → notebook orada da hazır

### iPad Pencil flow (mobile)
1. Notebook chat → "El yazısı" butonu (yeni)
2. Modal açılır → "Matematik" mode seç
3. Apple Pencil ile `∫₀^∞ e^(-x²) dx` yaz
4. "Yazıyı Tanı" → 2sn sonra `\int_0^\infty e^{-x^2} dx` LaTeX olarak inputa düşer
5. "Bu integralı çöz" gönder → AI cevabı

### Multi-device sync
1. Web'de PDF upload başla → status: processing (web)
2. Mobile'a geç → aynı notebook açıkken status anında "processing" görünür
3. PDF hazır olunca her iki cihazda eş zamanlı sources listesi güncellenir
4. Mobile'dan mesaj gönder → web tab'ında anında görünür (Realtime channel)

## Bilinen Limitler

- Tailwind v3 kullanıyoruz (v4 stable değil); migration sonra
- KaTeX render Sprint 7'de eklenmedi (math output raw kullanıcıya gösteriliyor)
- iPad Catalyst app build yapılmadı (Sprint 8'e taşındı, bundle config gerek)
- Web service worker (offline mode) defer — gelecek polish
- Web Studio detail page yapılmadı ([sid]/page.tsx eklenmeli, mobile'daki gibi)

## Sonraki

**Sprint 8 — B2B Kurumsal** (~3 hafta) — son sprint
- Kurumsal hesaplar (organization)
- Öğretmen → öğrenci atamaları
- Sınıf yönetimi
- Toplu lisans (bulk seat purchase)
- SSO (Google Workspace + Microsoft Entra ID)
- Admin paneli (organization-scoped)
- SCIM provisioning
- Bulk user import (CSV)
- Audit log

Bu sprint sonrası **4/4 tüm plan tamam** — Kavra'nın B2C + B2B + cross-platform tam donanımlı versiyonu.
