# Kavra

> **Kavra. Her şeyi.** — 150 pedagojik tekniği tek uygulamada birleştiren, Groq destekli, Türkçe konuşan kişisel öğrenme AI'ı.

**Android-first** · Expo + React Native · Supabase · Fastify · Groq · Whisper · Piper TTS

---

## Hızlı Başlangıç (Faz 0)

### Ön Koşullar

- Node.js ≥ 20
- pnpm 9+ (`npm i -g pnpm`)
- Android Studio + emülatör **veya** gerçek Android cihaz (USB debug açık)
- Supabase hesabı (ücretsiz, [supabase.com](https://supabase.com))
- Groq hesabı — admin key için ([console.groq.com](https://console.groq.com))
- Expo hesabı — EAS Build için ([expo.dev](https://expo.dev))

### 1. Repo kur

```bash
git clone <kendi-repo-url>
cd kavra
pnpm install
```

### 2. Supabase projelerini oluştur

1. [supabase.com/dashboard](https://supabase.com/dashboard)'da giriş yap
2. **New Project** → `kavra-prod` (region: `eu-central-1 Frankfurt`, strong DB password)
3. Aynı adımı `kavra-staging` için tekrarla
4. Her iki proje için şunları not al (Project Settings > API):
   - Project URL
   - `anon` public key
   - `service_role` key (SECRET!)

### 3. Supabase CLI kur ve migration push

```bash
# Mac/Linux
brew install supabase/tap/supabase

# Ya da npm ile
npm i -g supabase

# Proje köküne gir
cd packages/db

# Production'a bağlan
supabase link --project-ref <project-id>

# Migration'ları push et
supabase db push
```

Bu adım sonrası Supabase Dashboard > Database > Tables'da 30+ tablonu görmelisin.

### 4. Master Encryption Key üret

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Çıktı: a1b2c3... (64 karakter hex) — bunu not al
```

Bu anahtar kullanıcıların Groq API key'lerini şifrelemek için. **Kaybedersen tüm kullanıcı anahtarları decrypt edilemez.** Bir password manager'a kaydet.

### 5. `.env` dosyasını doldur

Kök dizinde `.env` oluştur, `.env.example`'ı referans al:

```bash
cp .env.example .env
nano .env  # veya istediğin editör
```

Minimum dolduracakların:
- `NEXT_PUBLIC_SUPABASE_URL` (kavra-prod)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `EXPO_PUBLIC_SUPABASE_URL` (aynı)
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` (aynı)
- `MASTER_ENCRYPTION_KEY` (4. adımdan)
- `GROQ_ADMIN_KEY` (kendi Groq anahtarın, console.groq.com/keys)

Diğerleri (Resend, Sentry, Upstash, PostHog, OpenAI) **Faz 1+** için gerekli, şimdi boş bırakılabilir.

### 6. Seed data'yı yükle

```bash
# Modüller + örnek teknikler migration'da zaten seed edildi
# 150 tekniğin tamamını yüklemek için:
pnpm db:seed
```

### 7. Google Auth kur (opsiyonel, önerilir)

1. [Google Cloud Console](https://console.cloud.google.com) → OAuth 2.0 Client ID oluştur
2. Authorized redirect URI: `https://<project-id>.supabase.co/auth/v1/callback`
3. Client ID + Secret'ı Supabase Dashboard > Authentication > Providers > Google'a gir

### 8. Worker-LLM'yi başlat

```bash
pnpm dev:worker
# 🚀 worker-llm http://0.0.0.0:4001 üzerinde hazır
```

Test et: `curl http://localhost:4001/health` → `{"status":"ok"}`

### 9. Mobile App'i başlat

Yeni terminal aç:

```bash
pnpm dev:mobile
```

Metro bundler bir QR kod üretir.

**Seçenek A: Expo Go** (en hızlı, test için)
- Google Play'den **Expo Go** uygulamasını indir
- Kamerayı QR koda tut → uygulama Expo Go içinde açılır

**Seçenek B: Development Build** (native modüller için)
```bash
cd apps/mobile
pnpm android  # USB'ye takılı cihaza veya emülatöre yükler
```

### 10. Web Landing (opsiyonel)

```bash
pnpm dev:web
# http://localhost:3000 → Landing sayfası
# http://localhost:3000/admin → Admin iskelet
```

---

## Proje Yapısı

```
kavra/
├── apps/
│   ├── mobile/              Expo Android app (ana client)
│   ├── web/                 Next.js landing + admin paneli
│   └── worker-llm/          Fastify: Groq SSE proxy + API key CRUD
├── packages/
│   ├── db/                  Supabase migrations + typed client
│   │   └── supabase/migrations/
│   │       ├── 0001_initial_schema.sql    (30+ tablo + pgvector)
│   │       ├── 0002_rls_policies.sql      (tüm RLS + storage buckets)
│   │       └── 0003_seed_data.sql         (modüller + AI kişilikleri)
│   └── shared/              Zod şemaları + 150 teknik + SM-2
├── .env.example
├── biome.json               Lint + format (ESLint+Prettier yerine)
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── turbo.json
```

---

## Veritabanı Şeması (Özet)

**30+ tablo, 7 bucket, tam RLS.**

| Grup | Tablolar |
|---|---|
| Kullanıcı | `profiles`, `user_preferences`, `streaks`, `achievements`, `subscriptions` |
| Güvenlik | `api_keys` (AES-256-GCM şifreli) |
| LLM | `llm_models` (Groq'tan sync), `usage_logs` |
| Müfredat | `modules`, `techniques` (150 adet), `personalities` |
| İçerik | `subjects`, `concepts` (pgvector), `concept_relations` |
| Ders | `lessons`, `messages`, `audio_recordings`, `images` |
| Tekrar | `progress` (SM-2), `flashcards` (Leitner), `generated_flashcards` |
| Değerlendirme | `quiz_attempts`, `error_portfolio`, `reflections` |
| Planlama | `goals`, `study_plans`, `study_sessions`, `focus_sessions` |
| Belge | `documents`, `document_chunks` (pgvector) |
| Premium | `voice_clones`, `exports`, `weekly_reports` |
| Inbox | `inbox_items` (paylaşım menüsü) |

---

## Mimari Notları

### Veri Akışı — Sesli Ders

```
Android mikrofon (expo-av)
  → Supabase Storage (audio-input bucket)
  → Worker-LLM /api/voice/transcribe
    → Groq Whisper-large-v3-turbo ($0.04/saat)
  → metin → /api/chat/stream (SSE)
    → Groq Llama 3.3 70B Versatile
  → yanıt cümle cümle → Piper TTS (worker-voice)
  → MP3 → expo-av player
```

### API Key Güvenliği

1. Kullanıcı Ayarlar > API Anahtarları'ndan `gsk_...` yapıştırır
2. Worker-LLM Groq'ta test eder
3. AES-256-GCM ile şifreler (`MASTER_ENCRYPTION_KEY` ile)
4. DB'ye `key_encrypted`, `key_iv`, `key_tag`, `key_last4` olarak kaydeder
5. UI'da her zaman `gsk_•••••abcd` maskeli görünür
6. "Göster" butonu biometrik onay + 30 sn modal

### RLS Garantileri

Her kullanıcı tablosunda `auth.uid() = user_id` politikası var. `anon` key ile yapılan hiçbir sorgu başka kullanıcının verisini göremez. Service-role key **sadece** worker'larda, **asla** client'ta.

---

## Faz 0 Çıktı Kriterleri (Cuma Hedefi)

- [x] Monorepo kurulu, `pnpm install` hatasız
- [x] Supabase migrations push edilmiş
- [x] Android cihazında APK açılıyor
- [x] Signin ekranı görünüyor
- [x] Email + şifre ile kayıt + giriş
- [x] Dashboard ekranı (boş ama canlı)
- [x] Çıkış → geri signin'e döner
- [x] Supabase'de `profiles` kaydı otomatik oluşur

---

## Faz Yol Haritası

| Faz | Süre | İçerik |
|---|---|---|
| 0 | 1 hafta | **Şu an buradayız.** Temel kurulum |
| 1 | 3 hafta | Groq chat streaming + API key UI |
| 2 | 2 hafta | Sesli katman (Whisper + Piper + expo-speech) |
| 3 | 2 hafta | PDF upload + Vision + handwriting |
| 4 | 4 hafta | Teaching Engine + 150 teknik aktif + concept map 2D |
| 5 | 3 hafta | SM-2 flashcard + quiz + error portfolio |
| 6 | 2 hafta | Pomodoro + takvim + WOOP + weekly report |
| 7 | 2 hafta | AI kişilikler + Pro (Stripe) + voice clone + 3D map |
| 8 | 2 hafta | Offline-first tam destek + PDF export |
| 9 | 1 hafta | Play Store submission |
| 10 | 2 hafta | iOS + Web export |

**Toplam: 24 hafta (~6 ay)**

---

## Sık Komutlar

```bash
pnpm dev                  # Her şeyi paralel başlat
pnpm dev:mobile           # Sadece Expo
pnpm dev:web              # Sadece Next.js
pnpm dev:worker           # Sadece Fastify

pnpm db:migrate           # Supabase migration push
pnpm db:seed              # 150 teknik yükle
pnpm db:types             # TypeScript types generate et

pnpm typecheck            # Tüm paketleri tip kontrolü
pnpm lint                 # Biome linter
pnpm check                # Biome auto-fix

# Mobile
cd apps/mobile
pnpm android              # Native Android build & yükle
pnpm build:android:preview  # EAS preview APK
pnpm build:android:prod     # EAS production AAB
```

---

## Sorun Giderme

**"MASTER_ENCRYPTION_KEY env değişkeni eksik"**
→ Kök `.env` dosyasını kontrol et. Worker-LLM bunu okuyor.

**"Supabase bağlantı bilgileri eksik"**
→ Expo için `EXPO_PUBLIC_*` prefixli değişkenler gerekli. `.env`'de hem `NEXT_PUBLIC_*` hem `EXPO_PUBLIC_*` olmalı.

**Metro bundler yavaş açılıyor**
→ `.expo/` ve `node_modules/.cache` klasörlerini sil, tekrar dene.

**APK yüklenmiyor**
→ USB debug açık mı? `adb devices` ile cihazı görüyor musun?

**Expo Go'da "Network request failed"**
→ Telefon ile bilgisayar aynı WiFi'da mı? Gerekirse `--tunnel` bayrağıyla başlat: `pnpm dev:mobile --tunnel`

---

## Katkı

Kavra tek kişilik ürün; dış katkı şu anda açık değil. Mimari v3 dokümanı referans — değişiklikleri konuşmadan kod yazma.

## Lisans

Proprietary · © 2026 Kavra
