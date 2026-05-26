# Faz 7 — Premium: Stripe + Voice Cloning + 3D + App Lock + Tema

> Kavra'nın **monetizasyon ve premium katmanı**. 6 Faz boyunca kurduğumuz değer
> önerisinin Pro yüzeylerle ayrılması, davranışsal disiplin için cron, gizlilik
> için app lock, kişiselleştirme için tema, ve ses klonlama gibi
> rakipsiz bir premium feature.

## Bu Faz'ın 6 Çekirdeği

### 1. Stripe Subscription + Entitlement

**Single source of truth: `user_entitlements` view.**

Her tablo update'inde view otomatik güncel hesaplama yapar:
```sql
case
  when tier = 'pro_lifetime' and lifetime_purchased_at is not null then true
  when tier in ('pro_monthly', 'pro_yearly')
    and status in ('active', 'trialing')
    and current_period_end > now()
  then true
  else false
end as is_pro
```

Mobile her açılışta `/api/me/entitlement` çağırıyor (5dk cache). Server tarafında **defense-in-depth** — her Pro endpoint'te `requirePro()` guard.

**Stripe Webhook idempotent**:
- `checkout.session.completed` → lifetime ise `lifetime_purchases`'e + `subscriptions.tier='pro_lifetime'`
- `customer.subscription.created/updated` → `subscriptions` upsert
- `customer.subscription.deleted` → `tier='free'`
- `invoice.payment_failed` → `status='past_due'`

`fastify-raw-body` plugin signature verification için raw body sağlıyor.

**Fiyatlandırma**:
- $4.99/ay
- $39/yıl (%35 indirim)
- $99 lifetime — ilk 100 alıcı için early bird (`lifetime_purchases.early_bird_number` 1-100, sonra null)

### 2. F5-TTS Voice Cloning

**Modal serverless GPU üzerinde A10G**.

Akış:
1. Kullanıcı 30sn ses kaydeder (expo-av, WAV 16kHz mono)
2. Mobile `/upload-url` ile signed URL alır → audio'yu Storage'a PUT
3. `/voice-clones` POST ile metadata kaydedilir
4. Synthesize: kullanıcı dersi başlatır → text → Modal endpoint → F5-TTS infer → MP3

**Maliyet**: ~$0.50-1.00 / Pro user / ay (10-30 sentez varsayımı, A10G $1.10/saat).

**Mimari karar**: Reference audio her sentezde Modal'a indiriliyor (zero-shot, embed cache yok). Sebep: F5-TTS pipeline'ı zaten bunu yapıyor, custom embed cache eklemek karmaşıklığı arttırırdı, performans kazancı az.

**Limit**: Pro kullanıcı ayda 10 yeni klon yaratabilir. Klon sentezi sınırsız (Modal usage'a tabi).

### 3. 3D Concept Map (react-three-fiber)

3 boyutlu force-directed layout:
- **Initialization**: Fibonacci sphere (golden angle) düzeni
- **Forces**: Coulomb repulsion + Hooke attraction (edges) + center gravity
- **Iterations**: 150 — stabil yerleşim için yeterli
- **Render**: Three.js spheres, mastery'ye göre boyut/renk
- **Camera**: AutoOrbit (golden ratio orbit, kullanıcı seçim yapınca durur)
- **Edges**: BufferGeometry line segments

**Performans**: 30 concept'e kadar 60fps Android orta seviye telefonlarda. Daha fazla için instanced mesh gerekecek (Faz 8+).

`expo-gl` + `expo-three` ile native GL backend, `@react-three/fiber/native` adapter.

### 4. Cron Worker — 3 Schedule

`apps/worker-cron/` — yeni servis. node-cron ile:

| Schedule | Job | Amaç |
|---|---|---|
| `0 * * * *` | daily-review-reminder | Saat başı kullanıcının `notify_review_reminder_hour` denk gelirse "X kart hazır" push |
| `0 9 * * 1` | weekly-report-generation | Pazartesi 09 UTC, geçen hafta aktif kullanıcılar için AI rapor + push |
| `0 21 * * *` | streak-warning | Her gün 21 UTC, 3+ streak'i tehlikedeyse "loss aversion" push |

**RUN_MODE**:
- `scheduled` (default) → sürekli çalışan worker (Render `type: worker`, $7/ay)
- `once-<job>` → tek seferlik exit (Render Cron Jobs, $0.50/job/ay)

`render.yaml`'da her ikisi de tanımlı, deploy sırasında biri seçilir.

**Audit**: `cron_job_runs` tablosu — hangi job ne zaman, kaç user processed, kaç push gönderildi, başarı/hata.

### 5. App Lock — Biometric

Lifecycle state machine:
1. App açılır → `isLocked=true` (eğer settings.enabled)
2. Kullanıcı biometric → unlock
3. Background'a atılır → `lastBackgroundedAt` timestamp
4. Foreground'a döner → `(now - lastBackgroundedAt) >= timeoutSeconds` ise tekrar lock

5 timeout seçeneği: anında, 30sn, 1dk, 5dk, 15dk.

`expo-local-authentication` Face ID / Touch ID / device PIN. Race condition koruması için `appStateRef` ile prev/next karşılaştırması.

### 6. Tema Sistemi

10 tema (3 free + 7 Pro):
- **Free**: Indigo Amber (default), Mono Dark, Paper
- **Pro**: Forest Dawn, Cherry Blossom, Cosmic, Sunset, Ocean, Matcha, Graphite

`useThemeStore` Zustand persist (AsyncStorage). Tema değiştiğinde `user_preferences.theme_id` server'a yazılır → cross-device sync.

Pro tema seçimi: `is_pro_only=true && !isPro` → upgrade alert.

## Yeni Worker: `apps/worker-cron/`

```
worker-cron/
├── package.json         node-cron + pino
├── tsconfig.json
├── Dockerfile
└── src/
    ├── index.ts         schedule yönetimi + RUN_MODE handling
    ├── supabase.ts      admin client + Expo Push batch helper
    └── jobs/
        ├── daily-review-reminder.ts
        ├── weekly-report-generation.ts
        └── streak-warning.ts
```

## Yeni Mobile Dosyalar

```
src/hooks/
├── useEntitlement.ts        Pro kontrol + pricing
├── useTheme.ts              Tema store + DB sync
├── useAppLock.ts            Lock state machine + biometric
└── useVoiceClones.ts        2-step upload + sentez

src/components/
├── pro/ProGuard.tsx         Reusable paywall card + ProBadge
└── lock/AppLockScreen.tsx   Biometric prompt overlay

app/
├── upgrade.tsx              Paywall (3 plan + early bird)
├── settings/theme.tsx       Tema picker
├── settings/app-lock.tsx    Lock + timeout ayarları
├── settings/voice-clones.tsx   Klon kayıt + liste
└── subject/[id]/map3d.tsx   3D concept map
```

## DB Migration `0007_premium.sql`

- **subscriptions** — Stripe sync
- **user_entitlements** — view, `is_pro` helper function
- **voice_clones** — F5-TTS metadata
- **themes** — 10 tema seed
- **lifetime_purchases** — early bird numaralandırma (1-100)
- **cron_job_runs** — schedule audit
- **usage_quotas** — ay bazlı sayaçlar
- **user_preferences** ek alanlar: `app_lock_enabled`, `theme_id`, `notify_review_reminder_hour`, `notify_weekly_report`, `notify_streak_warning`
- **storage bucket `voice-references`** + RLS user-scoped

## Yeni Env Değişkenleri

```bash
# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_MONTHLY=price_...
STRIPE_PRICE_YEARLY=price_...
STRIPE_PRICE_LIFETIME=price_...

# Modal F5-TTS (deploy sonrası)
MODAL_F5TTS_URL=https://<workspace>--kavra-f5tts-synthesize.modal.run
MODAL_API_TOKEN=

# Cron worker
SYSTEM_GROQ_KEY=gsk_...   # weekly report için sistem-genel Groq
```

## Modal F5-TTS Deploy

```bash
cd infra/modal
pip install modal
modal setup
modal deploy modal_f5tts.py
# Çıktı: https://<workspace>--kavra-f5tts-synthesize.modal.run
# Bu URL'i .env'e ekle
```

Detay: `infra/modal/README.md`.

## Stripe Setup

1. Stripe dashboard → Products → 3 ürün oluştur:
   - "Kavra Pro Aylık" → $4.99/ay recurring
   - "Kavra Pro Yıllık" → $39/yıl recurring
   - "Kavra Lifetime" → $99 one-time
2. Her ürünün price_id'sini `.env`'e
3. Webhook endpoint: `https://your-api.com/api/stripe/webhook`
4. Webhook events: `checkout.session.completed`, `customer.subscription.*`, `invoice.payment_failed`
5. Webhook secret'ı `.env`'e

## Test Akışı

```bash
unzip kavra-faz7.zip && cd kavra
pnpm install
cd packages/db && pnpm supabase db push   # 0007 migration
cd ../.. && pnpm dev:workers              # 4 worker artık (LLM + voice + PDF + cron)
pnpm dev:mobile
```

### Subscription
1. Profile → Pro Üyelik → Pro paywall görünür
2. "Yıllık" seç → Stripe Checkout web'de açılır → test kart `4242 4242 4242 4242`
3. Başarılı → mobile'a kavra:// deeplink ile döner → `useEntitlement` 5dk içinde update
4. Tekrar profile → "Sen zaten Pro'sun"

### Voice Cloning
1. Profile → Ses Klonlarım → "Yeni Klon Kaydet"
2. Mikrofona dokun → 30sn referans metni oku → durdur → İsim ver → Kaydet
3. Modal endpoint deploy edilmişse `/api/voice-clones/:id/synthesize` ile sentezleyebilirsin

### 3D Map
1. Subject detay → "3D Harita" butonu
2. Kavramları space'te oto-orbit kamerayla görürsün, dokun → durur

### App Lock
1. Profile → App Lock → toggle aç → Face ID prompt
2. Uygulamayı arka plana at, geri gel → tekrar Face ID

### Tema
1. Profile → Tema → Pro temalardan birine bas → Pro alert
2. Free temadan birini seç → görsel değişir

## Performans / Maliyet (1000 aktif Pro user)

| Sistem | Aylık |
|---|---|
| Modal F5-TTS (A10G) | ~$30-50 |
| Cron worker (Render starter) | $7 |
| Stripe (% gelir) | %2.9 + 30¢ |
| OpenAI embeddings (Faz 4 RAG) | $5 |
| **Toplam ek (Pro)** | ~$50-65 |

Pro gelir ($4.99 × 1000 = $4990) - maliyet → **net ~95%** marj.

## Mimari Kararlar

### Neden `user_entitlements` view?
DB tek truth source. Mobile cache + server guard "defense in depth". Webhook delay (Stripe → bizim sunucu, 1-2sn) toleranslı çünkü mobile 5dk cache var.

### Neden lifetime ayrı tablo?
`subscriptions.tier='pro_lifetime'` yeterli ama `lifetime_purchases` audit + early bird numaralandırma için ayrı. Refund durumunda revoke kolay.

### Neden Modal F5-TTS, kendi sunucumuz değil?
GPU bizim Render plan'ımızda yok. Modal serverless A10G $1.10/saat, idle sıfır. Pro user başına ~30sn/ay GPU = ~$0.30. Kendi sunucumuz olsa $200+/ay sabit gider.

### Neden cron 3 ayrı job?
Single responsibility, paralel hata izolasyonu. Daily reminder fail ederse weekly report etkilenmez. Audit log her job için ayrı.

### Neden 3D map react-three-fiber, native module değil?
Tek codebase, web/iOS/Android aynı kod. expo-gl native GL erişimi sağlıyor, performans yeterli. Native modül CI/CD karmaşıklığı + license başağrısı.

## Sınırlamalar

- **Stripe in-app purchase yok** (App Store/Play %30 komisyon almıyor şimdilik). iOS/Play Store yayını için RevenueCat entegrasyonu Faz 8'de gerekecek.
- **3D map 30+ concept'te yavaşlar** — instanced mesh Faz 8.
- **Voice clone TR optimize** — diğer diller F5-TTS desteklediği kadar (en, zh, ja, jp).
- **App lock biometric ZORUNLU** — PIN-only desteği yok (ileride eklenecek).
- **Cron timezone** — şu an tüm push'lar UTC saat bazlı. Faz 8'de user.timezone alanı.

## Faz 7 Başarı Kriterleri

- [x] Stripe checkout (3 tier) + webhook idempotent + billing portal
- [x] `user_entitlements` view + `is_pro()` helper
- [x] F5-TTS Modal deployment + worker-voice integration
- [x] 3D concept map (react-three-fiber, force-directed, auto orbit)
- [x] Cron worker (3 schedule, RUN_MODE dual-mode)
- [x] App lock biometric + 5 timeout seçeneği + lifecycle
- [x] 10 tema (3 free + 7 Pro) + Pro guard
- [x] Voice clone kayıt + liste + sentez
- [x] Pricing/paywall UI + early bird counter
- [x] ProGuard reusable component, tüm Pro yüzeylere uygulandı

## Sonraki — Faz 8 (Offline-first + Multi-device + Export)

- expo-sqlite local cache (uçak modunda da çalışır)
- PDF export (haftalık rapor, kavram listesi)
- Multi-device sync (last-write-wins → CRDT)
- RevenueCat (iOS/Play in-app purchases)
- User timezone alanı + cron tz-aware
- Webhook retry queue
- Open-ended quiz semantik karşılaştırma (embedding similarity)
