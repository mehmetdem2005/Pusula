# Faz 12 Sprint 5 — Yayın Hazırlık (Launch Ready)

> Kavra mağazaya çıkmaya hazır. App Store + Play Store + RevenueCat IAP +
> push notif + AI moderation + GDPR compliance + crash reporting + privacy/terms.

## Bu sprintteki 9 sistem

### 1. DB Migration `0013_launch_infrastructure.sql`
- **`user_devices`** — multi-device sync, push token, last_active_at
- **`moderation_log`** — AI içerik denetim kayıtları (verdict, categories, action)
- **`user_feedback`** — in-app feedback (bug/feature/rating/general/crash)
- **`review_prompt_state`** — App Store review iste zamanı (heuristik)
- **`announcements`** — admin-managed in-app banner (info/feature/maintenance/critical)
- **`user_announcement_state`** — kullanıcı dismiss tracking
- **`account_deletion_requests`** — 14 günlük geri alınabilir silme (Apple/Google requirement)
- **`user_entitlements`** — view → table migration (mobile IAP için source kolonu eklendi)
- **`subscription_events`** — audit log (RevenueCat + Stripe webhook history)

### 2. Devices + Push Notifications `routes/devices.ts`
- Expo Push Notification Service entegrasyonu (`exp.host/--/api/v2/push/send`)
- Batch 100 message/request (Expo limit)
- Admin-only `/api/devices/push` toplu bildirim endpoint
- Per-device push enable/disable toggle
- Multi-device sync için `device_id` unique per user

### 3. AI Moderation `routes/moderation.ts`
- **OpenAI Moderation API** `omni-moderation-latest` — text + image, ücretsiz, multilingual (TR iyi)
- 3-tier verdict: clean / flagged / blocked
- **Hard block**: `sexual/minors`, `self-harm/intent`, `violence/graphic`, `*/threatening`
- **Soft flag**: sexual, self-harm, violence, hate, harassment, illicit
- Confidence > 0.7 + soft flag → blocked
- Fail-open: API down olursa izin ver (log'la)
- Internal helper export: diğer route'lar `moderateInternal(text)` çağırabilir

### 4. Launch routes `routes/launch.ts`
- **Feedback CRUD**: 5 tip (bug/feature_request/rating/general/crash) + admin triage
- **Account deletion**: 14 günlük scheduled (cancel within window)
- **Data export**: 14 tablodan tüm user data JSON
- **Announcements**: targeting (free/pro/admin × ios/android/web × app version range)
- **Review prompt heuristic**: 5+ flashcard + 30 gün cooldown + 1 kez declined sonra hiç sorma

### 5. RevenueCat Webhook `routes/revenuecat.ts`
- iOS/Android in-app purchase event handler
- 12 event type: INITIAL_PURCHASE, RENEWAL, CANCELLATION, EXPIRATION, BILLING_ISSUE, vb.
- Bearer token auth (`REVENUECAT_WEBHOOK_AUTH`)
- Product → tier mapping (`kavra_pro_monthly` → `pro` 31 gün)
- Cancel ≠ revoke: kullanıcı iptal etse de süre dolana kadar Pro
- Audit trail: `subscription_events` tablosuna her event yazılır

### 6. Mobile RevenueCat Hook `useRevenueCat.ts`
- `react-native-purchases@8.7.0` SDK wrapper
- `Purchases.configure({ apiKey, appUserID })` ile auth bağlama
- `getOfferings()` → monthly/annual/lifetime packages
- `purchasePackage()` → IAP transaction
- `restorePurchases()` → "satın alımları geri yükle" (Apple zorunlu)
- `customerInfo.entitlements.active['kavra-pro']` ile Pro check

### 7. Push Notifications Hook `usePushNotifications.ts`
- `expo-notifications` permission flow
- Expo Push Token al + backend'e device kaydet
- Android channels: default, reviews, achievements
- Tap listener (deep link handler placeholder)
- `scheduleLocalNotification` helper (FSRS reminder için)

### 8. Mobile UI — 5 yeni screen + 2 component
- **`settings/account.tsx`** — Hesap yönetimi: data export + 14 gün delete + privacy/terms link
  - Pending deletion banner (cancel button)
  - "HESABIMI SİL" explicit consent text
- **`feedback.tsx`** — In-app feedback: 4 tip kartı + 5 yıldız + 2000 char message
  - App version + platform otomatik dolar
- **`MobileIAPPaywall.tsx`** — RevenueCat ile native paywall
  - 3 paket (lifetime/annual/monthly) localized fiyat
  - `restorePurchases` butonu
  - Apple/Google copy yasal disclaimer
- **`AnnouncementBanner.tsx`** — 4 level (info/feature/maintenance/critical)
  - Tap to dismiss + clicked tracking
  - CTA button (internal route veya external Linking)

### 9. Production Config + Compliance
- **`app.config.ts`** — version 1.0.0, ATT permission, associated domains, deep links
- **`eas.json`** — 3 build profile (dev/preview/production) + submit config
- **`STORE-METADATA.md`** — App Store + Play Store listing copy (Türkçe + English), screenshots checklist
- **`privacy/page.tsx`** + **`terms/page.tsx`** — GDPR + KVKK uyumlu, Türkçe sade dil
- **Sentry crash reporting** `lib/sentry.ts` — PII scrubbing, %20 traces in production, source maps EAS upload

## Mimari Kararlar (Sprint 5)

### user_entitlements view → table migration
Sprint 1'de view'dı (premium_subscriptions'tan compute). Mobile IAP için `source` kolonu (stripe/app_store/play_store) ve `external_subscription_id` lazım → table'a migrate. Mevcut Stripe Pro kullanıcılar seed insert'le taşındı.

### RevenueCat over native StoreKit/Google Billing
Tek SDK ile iki platform + Stripe entegrasyonu + restore + family sharing + offer codes + analytics. Native SDK'larda her platforma ayrı yazmak gerekirdi. Free tier: 10k$ MTR'a kadar ücretsiz.

### Manifest pattern + IAP product naming
`kavra_pro_monthly`, `kavra_pro_yearly`, `kavra_pro_lifetime` — App Store ve Play Store'da aynı id (cross-platform restore için). Eğer farklı yaparsak `app.kavra.pro.monthly` alternatif mapping mevcut.

### 14 gün delete window
Apple Guideline 5.1.1(v): hesap silme zorunlu, hemen olmalı. AMA "geri alabilirsin" yazıyorsan 14-30 gün soft delete normal. Banking app'lerden esinlendik. Cron job (Render Standard) `account_deletion_requests` durumu pending + scheduled_for < now() ise hard delete eder.

### OpenAI Moderation API over custom NSFW
Custom NSFW classifier maintain etmek pahalı. OpenAI Moderation **ücretsiz**, multilingual (Türkçe iyi), text + image, low latency (<500ms). Tek dezavantaj: politik+illegal aşırı sınıflandırabiliyor → bu yüzden 0.7 threshold + 2-tier verdict (flagged ≠ blocked).

### Push channel ayrımı (Android)
Tek channel'da hepsi gelirse user "tümünü kapat" der. 3 channel (genel/tekrarlar/başarılar) sayesinde tekrarları kapatmadan başarı bildirimini kapatabilir. iOS native bunu category olarak handle eder.

### Account deletion banner UI
Pending state'i settings ekranı açıldığında ilk gördüğü → kazara silmiş kullanıcıyı kurtarır. Çünkü 14 gün içinde 3 kez app'e giren kullanıcı bilinçsiz silmiştir.

### Sentry PII scrubbing
Email, authorization header, otomatik scrub. `sendDefaultPii: false`. User context sadece hashed userId.

### Privacy/Terms web'de değil app'te
Apple Submit ekranında "Privacy Policy URL" şart. Web'de tutmak link bozulmasını engelliyor (app güncellense bile politika değişebilir). KVKK ek metni `/privacy/kvkk` olarak ayrı (Türkiye'deki kullanıcılar için zorunlu).

## Maliyet (1000 Pro user/ay)

| Servis | Aylık |
|---|---|
| Sprint 4 baseline | $750-1100 |
| Apple App Store komisyonu (%30 ilk yıl, %15 sonra) | %15 cut |
| Google Play komisyonu (%15 < $1M, sonra %30) | %15 cut |
| RevenueCat ücretsiz <$10k MTR | $0 |
| Sentry Team plan | $26 |
| Expo EAS Production plan | $99 |
| Push notif (Expo ücretsiz) | $0 |
| **Sprint 5 ek** | **$125** |
| **Toplam altyapı** | **~$875-1225** |

**Komisyon dahil net: Pro $4.99/ay → ~$4.24 ($0.75 Apple/Google) → %72-77 marj**

Yıllık $39 ödeyenden net $33.15 → 1000 user × ortalama $20/yıl ARPU = **$20k/yıl gelir**, $1.1k/yıl x12 = $13.2k altyapı = **$6.8k/yıl net** (1000 Pro user'da). 5000 Pro user'da economies of scale → ~$80k/yıl net.

## Yeni Env

```bash
# Worker-LLM
REVENUECAT_WEBHOOK_AUTH=...        # Bearer token
SENTRY_DSN=...                      # https://xxx@sentry.io/yyy

# Mobile (EXPO_PUBLIC_*)
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_xxx
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_xxx
EXPO_PUBLIC_SENTRY_DSN=...
```

## Yeni deps

```json
// apps/mobile/package.json
"react-native-purchases": "8.7.0",
"expo-tracking-transparency": "~5.0.0",
"@sentry/react-native": "~6.10.0"
```

## Sanity

- Toplam dosya (no node_modules): **371**
- Yeni: 15 dosya (8 backend + 5 mobile + 2 web)
- Edited: 4 dosya (server.ts, _layout.tsx, app.config.ts, eas.json, render.yaml, package.json)
- API endpoints: 18 yeni (`/api/devices/*`, `/api/moderation/*`, `/api/feedback`, `/api/account/*`, `/api/announcements/*`, `/api/review-prompt/*`, `/api/revenuecat/*`)
- Mobile route: 2 yeni (`/settings/account`, `/feedback`)
- Migration: 1 (0013) — büyük (subscription_events, user_entitlements migration dahil)

## Pre-Submit Checklist

### Apple App Store

- [ ] Apple Developer Program $99/yıl ödendi
- [ ] App Store Connect app oluşturuldu
- [ ] Bundle ID `app.kavra` provisioning
- [ ] App icon 1024×1024 hazır
- [ ] Screenshot 6.9" iPhone (3 size minimum)
- [ ] App Preview video 15-30sn (opsiyonel)
- [ ] Privacy Policy URL `https://kavra.app/privacy` live
- [ ] Support URL `https://kavra.app/support` live
- [ ] App Privacy form doldurulmuş
- [ ] App Tracking: "Does not track" + ATT prompt aktif
- [ ] Demo account: review@kavra.app / ReviewMe2026!
- [ ] Account deletion path tested
- [ ] In-App Purchase products created in App Store Connect:
  - [ ] kavra_pro_monthly @ $4.99
  - [ ] kavra_pro_yearly @ $39.99
  - [ ] kavra_pro_lifetime @ $99.99
- [ ] RevenueCat dashboard offerings synced
- [ ] Sandbox test 5 scenario (purchase, cancel, refund, restore, family share)
- [ ] TestFlight beta 10+ tester feedback alındı
- [ ] EAS Submit production successful

### Google Play Store

- [ ] Google Play Console $25 one-time paid
- [ ] App listing oluşturuldu
- [ ] App icon 512×512 + adaptive icon 432×432 hazır
- [ ] Screenshot 1080×1920 (en az 2)
- [ ] Feature graphic 1024×500
- [ ] Data safety form doldurulmuş
- [ ] Content rating IARC questionnaire (PEGI 3 / Everyone)
- [ ] In-App Purchase products:
  - [ ] kavra_pro_monthly @ $4.99
  - [ ] kavra_pro_yearly @ $39.99
- [ ] Closed testing track (10+ tester)
- [ ] Open testing track 14 gün
- [ ] Production track ready

### Backend Production

- [ ] Render Standard plan ($25 her servis)
- [ ] Supabase Pro plan ($25/ay)
- [ ] Cloudflare R2 storage paid plan
- [ ] DNS: api.kavra.app, voice.kavra.app, pdf.kavra.app, kavra.app
- [ ] SSL all subdomains (Cloudflare auto)
- [ ] Environment vars set in Render dashboard
- [ ] Sentry project oluşturuldu, DSN env'a kondu
- [ ] OpenAI, Gemini, Groq, Supadata, ElevenLabs, RevenueCat hesapları aktif + faturalandırma
- [ ] Database backup scheduled (Supabase otomatik)

### Marketing

- [ ] Landing page kavra.app live
- [ ] Twitter/X @kavraapp
- [ ] Instagram @kavraapp
- [ ] LinkedIn page
- [ ] Press kit (logo, screenshots, founder bio)
- [ ] ProductHunt schedule
- [ ] Reddit r/turkey + r/Apple announcement draftı
- [ ] Eğitim influencer outreach listesi (10+ kişi)

## Sonraki Sprint Seçenekleri

### v1.1 polish (1-2 hafta, post-launch)
- YouTube çeviri toggle (TR↔orijinal, cache hazır)
- Modal Whisper worker deploy
- "Kaldığın yerden devam" video player
- Mermaid WebView render
- ElevenLabs v3 dialogue (Pro+ tier)
- Anthropic Citations API
- Slides .pptx export
- "Send feedback" → Threads/Instagram share

### Sprint 6 — Sosyal/Gamification (~2 hafta)
- Defter paylaşma (public link, view-only)
- Klan sistemi (10 kişilik study group)
- Liderlik tablosu (haftalık/aylık)
- Streak yarışı arkadaşlarla
- Public defter galerisi (curated)
- Achievement badges (NFT-feel)
- Kullanıcı profil sayfası

### Sprint 7 — Çoklu cihaz + Web
- Web app full feature parity
- Real-time multi-device sync (Supabase Realtime)
- Offline-first sync
- iPad pencil + handwriting
- Mac Catalyst app

### Sprint 8 — B2B
- Kurumsal hesaplar
- Öğretmen → öğrenci atamaları
- Sınıf yönetimi
- Toplu lisans
- SSO (Google Workspace, Microsoft 365)
- Kurumsal admin paneli
