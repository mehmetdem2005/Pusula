# Faz 1 Değişiklik Notları

Faz 0'dan Faz 1'e geçişte eklenen özellikler ve yeni dosyalar.

## Yeni Özellikler

### 1. Gerçek Chat Streaming ✨
- Mobile → Worker-LLM → Groq SSE relay
- Optimistic updates (mesajın hemen görünmesi)
- AbortController ile iptal
- Hata banner'ı
- Auto-scroll

### 2. API Key Yönetimi (Backend Bağlı)
- CRUD tüm işlemler gerçek
- AES-256-GCM şifreleme worker tarafında
- Test et / varsayılan yap butonları çalışıyor

### 3. Model Seçici
- Kategoriye göre gruplandırılmış (Fast / Versatile / Vision / Reasoning / Compound)
- DB boşsa user key'iyle otomatik senkronize
- Ders bazında model override

### 4. AI Kişilikleri
- 6 preset (Profesör, Abla/Abi, Sert Hoca, Sokratik, Komedyen, Minimalist)
- Her kişilik farklı `system_prompt_fragment` + `temperature`
- Ders sırasında değiştirilebilir

### 5. Onboarding Akışı
- 3 adım: Hoş geldin → API key ekle (atlanabilir) → Hazırsın
- Progress bar
- Atlama seçeneği
- İlk giriş sonrası otomatik açılır

### 6. Google Sign-In
- Expo WebBrowser + Supabase OAuth
- Deep link callback (`kavra://auth/callback`)
- **NOT**: Expo Go'da kısıtlı, Development Build önerilir

### 7. Worker-LLM İyileştirmeleri
- Dev modda CORS tüm origin'lere açık (Expo IP'si değişken)
- Rate limit 120 req/dk (token bazlı)
- SSE için Nginx `X-Accel-Buffering: no`
- Hata yönetimi + logging

## Yeni Dosyalar

```
apps/mobile/src/
├── lib/
│   ├── api.ts              ← JSON + SSE fetch wrapper (auth'lı)
│   └── google-auth.ts      ← Google Sign-In handler
├── hooks/
│   ├── useApiKeys.ts       ← CRUD + test + default
│   ├── useModels.ts        ← Model listesi + chat filter
│   ├── useLessons.ts       ← Lesson CRUD + useSendMessage (streaming)
│   └── useSubjects.ts      ← Subjects, personalities, profile
└── components/chat/
    ├── MessageBubble.tsx
    ├── ChatInput.tsx
    ├── ModelPickerModal.tsx
    └── PersonalityPickerModal.tsx

apps/mobile/app/
├── lesson/
│   ├── _layout.tsx
│   └── [id].tsx            ← Tam chat ekranı
└── onboarding.tsx          ← 3 adımlı akış
```

## Güncellenen Dosyalar

- `apps/mobile/app/_layout.tsx` → Onboarding yönlendirme eklendi
- `apps/mobile/app/(auth)/signin.tsx` → Google Sign-In butonu canlı
- `apps/mobile/app/(tabs)/index.tsx` → Gerçek lesson oluşturma
- `apps/mobile/app/settings/api-keys.tsx` → Backend bağlı CRUD
- `apps/worker-llm/src/server.ts` → CORS + rate limit iyileştirildi
- `apps/worker-llm/src/routes/chat.ts` → Kişilik + model override
- `apps/worker-llm/src/routes/models.ts` → Auto-sync (user key'iyle)

## Test Akışı

### 1. Worker-llm başlat

```bash
pnpm dev:worker
# 🚀 worker-llm http://0.0.0.0:4001
```

### 2. Bilgisayarın LAN IP'sini öğren

**Mac/Linux:**
```bash
ipconfig getifaddr en0   # Mac WiFi
# veya
hostname -I              # Linux
```

**Windows:**
```bash
ipconfig | findstr IPv4
```

Örnek çıktı: `192.168.1.42`

### 3. `.env`'de API URL'yi güncelle

```
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.42:4001
```

Telefon ve bilgisayar **aynı WiFi** olmalı.

### 4. Mobile başlat

```bash
pnpm dev:mobile
```

QR kodu Expo Go ile oku veya development build ile aç.

### 5. Akış

1. Kayıt ol / Giriş yap
2. Onboarding'de anahtarını ekle (`gsk_...`)
3. Dashboard → "Yeni sohbet"
4. İlk mesajını yaz → Groq'tan streaming yanıt
5. Header'daki 🎭 emoji ile kişilik değiştir
6. Model şeridinden farklı model seç

## Google Sign-In Kurulumu (Opsiyonel)

Expo Go'da sınırlı. Tam çalışması için Development Build gerekli.

### Supabase tarafı

1. Supabase Dashboard → Authentication → Providers → Google
2. Enable → Client ID + Secret gir (Google Cloud Console'dan)
3. Redirect URL: `https://<project-id>.supabase.co/auth/v1/callback`

### Google Cloud Console

1. OAuth consent screen doldur
2. Credentials → Create → OAuth client ID → Web application
3. Authorized redirect URIs: Supabase callback URL'si

### Mobile App

`app.config.ts`'de `scheme: 'kavra'` zaten var. Supabase dashboard'da:
- Authentication → URL Configuration
- Redirect URLs: `kavra://auth/callback` ekle

## Bilinen Sınırlamalar

- **Expo Go ile Google Sign-In** tam çalışmıyor (WebBrowser callback sorunu). Dev Build önerilir:
  ```bash
  cd apps/mobile
  pnpm android  # development build
  ```

- **Model listesi ilk açılışta boş** olabilir. API key ekledikten sonra otomatik sync tetiklenir.

- **Streaming performansı** telefonun işlemcisine ve ağa bağlı. İlk token latency ~1-2 sn.

## Faz 1 Başarı Kriterleri

- [x] API key ekle → test et → varsayılan yap
- [x] Yeni sohbet aç → mesaj yaz → Groq streaming yanıt al
- [x] Model değiştir → yanıt farklı modelle gelsin
- [x] Kişilik değiştir → AI tonu değişsin
- [x] Onboarding 3 adımı tamamlandı mı kontrol
- [x] Google Sign-In dev build'de çalışıyor

## Sonraki — Faz 2 (2 hafta)

Sesli katman:
- expo-av ses kaydı
- Groq Whisper STT entegrasyonu
- expo-speech (cihaz TTS)
- Piper TTS server (Render)
- Sesli ders push-to-talk modu
