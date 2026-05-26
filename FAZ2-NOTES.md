# Faz 2 — Sesli Katman

> Faz 1'den Faz 2'ye geçişte eklenen tüm dosya ve özellikler.

## Yeni Özellikler

### 1. Konuşma → Metin (STT)
- Groq Whisper Large v3 Turbo entegrasyonu
- 99 dil desteği, otomatik dil tespiti
- ~$0.04/saat (1 dakika yaklaşık $0.00067)
- Push-to-talk: mikrofon basılı tut, bırak → ses otomatik metne çevrilip mesaj olarak gönderilir

### 2. Metin → Konuşma (TTS)
**Hibrit strateji:**
- **Cihaz TTS** (`expo-speech`) — Android'in yerleşik motoru. Anlık, çevrimdışı, ücretsiz
- **Sunucu TTS** (Piper) — Render'da self-host, 30+ dil, kaliteli
- **Auto mod**: <200 karakter cihaz, ≥200 karakter sunucu

### 3. Voice Lesson Modu (`/voice-lesson/[id]`)
Tam ekran konuşmalı ders. 5 faz:
- 🎤 Idle — basılı tutmaya hazır
- 🔴 Recording — dinliyor (süre sayacı + pulse animasyonu)
- ✍️ Transcribing — Whisper'a gidiyor
- 🧠 Thinking — Groq düşünüyor (streaming)
- 💬 Speaking — Piper/cihaz seslendiriyor (orange pulse)

Haptic feedback ile basma/bırakma hissi.

### 4. Chat Ekranında Sesli Katman
- 🔊 Toggle — asistan yanıtları otomatik seslendirilsin
- 🎙️ Sesli derse geçiş butonu
- Mesaj uzun bas → o mesajı seslendir
- Chat input'ta mikrofon butonu (boş input'ta görünür)

### 5. Ses Ayarları (`/settings/voice`)
- TTS mode: Otomatik / Cihaz / Sunucu / Kapalı
- Voice seçici (Türkçe DFKI/Fettah)
- Hız slider (0.5x – 2x)
- Önizleme dinleme

## Yeni Dosyalar

```
apps/worker-voice/                      ← YENİ SERVİS
├── package.json
├── tsconfig.json
├── Dockerfile                          ← Piper + voice modelleri otomatik
└── src/
    ├── server.ts                       Fastify app, /health'te Piper kontrol
    ├── crypto.ts                       AES-256-GCM (worker-llm ile aynı)
    ├── supabase.ts                     Service client + key resolver
    ├── groq-stt.ts                     Whisper Large v3 Turbo wrapper
    ├── piper.ts                        Piper subprocess + SHA256 cache
    └── routes/
        ├── transcribe.ts               POST /api/voice/transcribe
        └── synthesize.ts               POST /api/voice/synthesize + GET voices

apps/mobile/src/lib/voice/              ← YENİ MODÜL
├── recorder.ts                         VoiceRecorder sınıfı (expo-av)
├── uploader.ts                         Supabase Storage'a base64 upload
└── tts.ts                              Hibrit TTS yöneticisi

apps/mobile/src/hooks/
├── useVoiceInput.ts                    Kayıt → upload → transcribe zinciri
└── useTTS.ts                           Metin seslendirme + isSpeaking state

apps/mobile/src/components/voice/
└── MicButton.tsx                       Push-to-talk + pulse + süre sayacı

apps/mobile/app/voice-lesson/           ← YENİ ROUTE
├── _layout.tsx
└── [id].tsx                            Tam ekran sesli mod

apps/mobile/app/settings/
└── voice.tsx                           Ses ayarları ekranı

render.yaml                             Render Blueprint (worker-llm + worker-voice)
```

## Güncellenen Dosyalar

- `.env.example` → `EXPO_PUBLIC_VOICE_BASE_URL`, `PIPER_BIN`, `PIPER_MODELS_PATH` eklendi
- `package.json` (root) → `dev:voice`, `dev:workers` script'leri
- `apps/mobile/app.config.ts` → `extra.voiceBaseUrl`
- `apps/mobile/package.json` → `expo-haptics`, `@react-native-community/slider`
- `apps/mobile/src/components/chat/ChatInput.tsx` → mikrofon butonu entegre
- `apps/mobile/app/lesson/[id].tsx` → TTS auto-play, sesli ders linki
- `apps/mobile/app/(tabs)/index.tsx` → sesli ders quick action
- `apps/mobile/app/(tabs)/profile.tsx` → voice ayar linki

## Kurulum (Yerel Test)

### 1. Yeni dependency'leri kur

```bash
cd kavra
pnpm install
```

### 2. Worker-voice için Piper yerel kurulum

**Mac:**
```bash
brew install piper-tts
# Voice indir
mkdir -p /opt/piper/models
cd /opt/piper/models
curl -L -O https://huggingface.co/rhasspy/piper-voices/resolve/main/tr/tr_TR/dfki/medium/tr_TR-dfki-medium.onnx
curl -L -O https://huggingface.co/rhasspy/piper-voices/resolve/main/tr/tr_TR/dfki/medium/tr_TR-dfki-medium.onnx.json
```

**Linux:**
```bash
# Piper binary
curl -L -o /tmp/piper.tar.gz https://github.com/rhasspy/piper/releases/download/2023.11.14-2/piper_linux_x86_64.tar.gz
sudo mkdir -p /opt/piper && sudo tar -xzf /tmp/piper.tar.gz -C /opt/piper --strip-components=1
sudo mkdir -p /opt/piper/models
# Sonra yukarıdaki gibi voice indir
```

**Windows:**
WSL2 + yukarıdaki Linux talimatları, veya Docker:
```bash
cd apps/worker-voice
docker build -t kavra-worker-voice .
docker run -p 4002:4002 --env-file ../../.env kavra-worker-voice
```

### 3. Worker'ları başlat

İki ayrı terminal:

```bash
# Terminal 1
pnpm dev:worker
# 🚀 worker-llm http://0.0.0.0:4001

# Terminal 2
pnpm dev:voice
# 🎙️ worker-voice http://0.0.0.0:4002
```

### 4. Mobile env

`.env` dosyasında bilgisayarın LAN IP'sini kullan:

```
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.42:4001
EXPO_PUBLIC_VOICE_BASE_URL=http://192.168.1.42:4002
```

### 5. Mobile başlat

```bash
pnpm dev:mobile
```

## Test Akışı

1. **Mikrofon izni**: İlk mikrofon kullanımında Android sistem dialogu çıkar → İzin Ver
2. **Push-to-talk** (chat ekranı):
   - Ana chat aç (yeni sohbet veya devam eden)
   - Boş input'ta mikrofon butonu basılı tut
   - Konuş → bırak → "Çeviriyorum..." → metin gönderilir → AI yanıt
3. **Auto-TTS toggle**:
   - Header'daki 🔇 → 🔊 yap
   - Yeni asistan mesajı geldikçe otomatik seslenir
4. **Sesli ders modu**:
   - Header'da 🎙️ ya da Dashboard'da "Sesli ders"
   - Tam ekran açılır
   - Beyaz daireye basılı tut → konuş → bırak
   - Ekranda phase görünür (recording → transcribing → thinking → speaking)
   - AI yanıt metni ekranda + sesli okuma paralel
   - "Konuşuyorken" butona basarsan TTS durur
5. **Ses ayarları** (Profil > Ses Ayarları):
   - TTS mode değiştir → "Önizleme dinle" ile test
   - Hız slider'ı kaydır → Önizleme yeni hızda
   - Kaydet → preferences DB'ye yazılır

## Bilinen Sınırlamalar

- **Cihaz TTS Türkçe kalitesi telefona göre değişir**: Pixel ve Samsung'da iyi, eski cihazlarda zayıf. Kalite önemliyse "Sunucu" mode kullan.
- **İlk Piper synthesize ~3-5 sn alır**: Subprocess başlatma + WAV üretimi. İkinci aynı metin **<100ms** (Storage cache).
- **Expo Go'da `expo-haptics` çalışır ama daha düşük kaliteli**: Dev Build'de gerçek haptic motoru.
- **Whisper m4a kabul ediyor** ama bazı Android cihazlarda mp4 container fark edilmiyor: Sorun olursa `expo-av` config'inde `extension: '.m4a'` `'.mp4'` deneyebilirsin.
- **Voice Lesson ekranında sürekli dinleme yok**: Push-to-talk default. Continuous (VAD ile sürekli dinleme) Faz 7'de planlandı.

## Maliyet (Bu Faz İçin)

| Servis | Maliyet | Kim öder |
|---|---|---|
| Whisper STT | $0.04/saat | Kullanıcının Groq key'i |
| LLM yanıt | Token başı | Kullanıcının Groq key'i |
| Cihaz TTS | $0 | — |
| Piper TTS | Render Standard $25/ay | Sen |
| Storage (audio cache) | Supabase Pro içinde | Sen |

Tipik kullanıcı (10 dk/gün sesli ders): ayda ~$0.20 Groq maliyeti — ücretsiz tier kapsar.

## Faz 2 Başarı Kriterleri

- [x] Mikrofon kayıt ve Whisper transkripsiyon çalışıyor
- [x] Cihaz TTS Türkçe konuşuyor
- [x] Piper TTS sunucuda çalışıyor (Docker)
- [x] Auto mode kısa/uzun metni doğru yere yönlendiriyor
- [x] Voice Lesson tam ekran 5 faz state machine
- [x] Ses ayarları kaydedilip uygulanıyor
- [x] Mesaj uzun-bas seslendirme

## Sonraki — Faz 3 (PDF + Vision, ~2 hafta)

- `worker-pdf` servisi (parse + chunking + embedding)
- PDF upload akışı + otomatik flashcard üretimi
- Resim upload + Groq Llama 4 Scout vision (handwriting + matematik)
- Paylaşım intent'i (WhatsApp/tarayıcıdan paylaş → Kavra'ya gelsin)
- Concept extraction onay swipe ekranı
