# Faz 3 — PDF + Vision + Paylaşım

> Faz 2'den Faz 3'e geçişte eklenen özellikler.

## Yeni Özellikler

### 1. PDF İşleme Pipeline
- `expo-document-picker` ile PDF seç
- Supabase Storage `user-documents` bucket'ına yükle
- worker-pdf: `pdfjs-dist` ile metin çıkar
- Paragraf bazlı chunk'lama (~2000 karakter, 200 overlap)
- OpenAI `text-embedding-3-small` (1536 dim)
- pgvector `document_chunks.embedding` alanına kaydet
- Status polling: processing → ready / failed

### 2. Otomatik Flashcard Üretimi
- Hazır dokümandan chunk başına 3 flashcard (Groq Llama 3.3 70B, JSON mode)
- `generated_flashcards` tablosuna `status: pending`
- Tinder-stil swipe ekranı: ✓ tut → `flashcards` tablosuna, ✗ atla
- Kart çevirme (ön/arka) + zorluk göstergesi

### 3. Kavram Çıkarma
- Dokümandan AI ile 5-15 ana kavram
- İsim + açıklama + zorluk + prerequisites
- Kullanıcı onayına sunulur (Faz 4'te concept'lere dönüşecek)

### 4. Vision (Fotoğrafla Öğren)
- `expo-image-picker` kamera / galeri
- Groq Llama 4 Scout multimodal
- 5 görev tipi:
  - 🔢 Matematik sorusu çöz (adım adım + LaTeX)
  - ✍️ El yazısı oku + konuyu açıkla
  - 📝 Metin çıkar (OCR alternatifi)
  - 📊 Diyagram analizi
  - 🖼️ Genel tanım

### 5. Paylaşım Intent (WhatsApp / Tarayıcı)
- Android intent-filter: `ACTION_SEND` (text/image/pdf)
- Kullanıcı WhatsApp'tan "Paylaş" → Kavra → `inbox_items` tablosuna kaydet
- `/inbox` ekranında liste + konuya ekleme / arşivleme
- URL tespiti otomatik (http/https)

## Yeni Dosyalar

```
apps/worker-pdf/                        ← YENİ SERVİS
├── package.json
├── tsconfig.json
└── src/
    ├── server.ts                       Fastify (port 4003)
    ├── supabase.ts                     Service + AES decrypt + Groq key resolver
    ├── pdf-parser.ts                   pdfjs-dist legacy + chunker
    ├── embeddings.ts                   OpenAI text-embedding-3-small batch
    ├── groq.ts                         JSON-mode chat + vision wrapper
    └── routes/
        └── pdf.ts                      /process, /extract-concepts, /generate-flashcards, /vision/analyze

apps/mobile/src/
├── hooks/
│   ├── useDocuments.ts                 CRUD + upload + process + flashcard
│   └── useVision.ts                    Kamera/galeri + analiz
└── lib/
    └── share-intent.ts                 WhatsApp intent handler

apps/mobile/app/
├── documents/
│   ├── _layout.tsx
│   ├── index.tsx                       Liste + upload
│   ├── [id].tsx                        Detay + eylemler
│   └── [id]/
│       └── flashcards.tsx              Tinder-stil onay swipe
├── scan.tsx                            Vision ekranı (5 task)
└── inbox.tsx                           Paylaşılan içerikler
```

## Güncellenen Dosyalar

- `.env.example` → `EXPO_PUBLIC_PDF_BASE_URL` eklendi
- `package.json` → `dev:pdf`, `dev:workers` (3 worker paralel)
- `apps/mobile/app.config.ts` → `extra.pdfBaseUrl`
- `apps/mobile/app/_layout.tsx` → `useShareIntentHandler` + yeni route screens
- `apps/mobile/app/(tabs)/index.tsx` → PDF + Fotoğraf quick action aktif
- `render.yaml` → `kavra-worker-pdf` Standard plan

## Test Akışı

### Lokal kurulum

```bash
# Root'da
pnpm install
cp .env.example .env  # değerleri doldur

# OPENAI_API_KEY gerekli! Embeddings için
# console.openai.com/api-keys
```

### Üç worker'ı paralel çalıştır

```bash
pnpm dev:workers
# ya da ayrı ayrı:
pnpm dev:worker   # 4001 (LLM)
pnpm dev:voice    # 4002 (STT/TTS)
pnpm dev:pdf      # 4003 (PDF/Vision)
```

### Mobile

```bash
pnpm dev:mobile
```

### Test senaryoları

**1. PDF yükle + flashcard üret**
1. Dashboard → "PDF yükle"
2. "+ PDF Yükle" → cihazdan PDF seç
3. Status `processing` → `ready` (~10-30 sn)
4. "Flashcard Üret" butonuna bas
5. Kaç kart üretildi mesajı → "İncele"
6. Swipe: ✗ atla, ✓ tut
7. Tuttukların artık Tekrar tabında

**2. Vision — matematik sorusu**
1. Dashboard → "Fotoğrafla"
2. Kamera ile bir matematik sorusu çek
3. "🔢 Matematik Sorusu" seç → Analiz Et
4. Llama 4 Scout adım adım çözüm üretir
5. Metin seçilebilir, kopyalanabilir

**3. WhatsApp paylaşım**
1. Herhangi bir WhatsApp mesajında "Paylaş" ikonu
2. Liste'de **Kavra** görünmeli (Android intent-filter)
3. Seç → Kavra açılır, `inbox_items` oluşur
4. Uygulamada `/inbox`'a git → paylaşılan içerik görünür

## Maliyet (Faz 3 Özelinde)

| İşlem | Birim | Maliyet |
|---|---|---|
| PDF chunk embedding | 1M token | $0.02 (senin OpenAI) |
| Flashcard üretim | Chunk başına | Kullanıcının Groq (ücretsiz tier) |
| Kavram çıkarma | Doküman başına | Kullanıcının Groq |
| Vision analiz | İstek başına | Kullanıcının Groq |

Tipik 10 sayfalık PDF: ~15 chunk × 500 token = 7500 token embed = **~$0.00015** (senin maliyet). Kullanıcının tek bir flashcard üretim seansı ~20k token Groq = ücretsiz tier içinde rahat.

## Bilinen Sınırlamalar

- **Tarama PDF'ler şimdilik desteklenmiyor**: Metin çıkmazsa `failed` status. OCR Faz 4'te.
- **Büyük PDF maksimum 20 chunk**: Maliyet koruması. 200+ sayfalık kitaplar bölümlere ayrılmalı.
- **Paylaşım intent Expo Go'da sınırlı**: Dev Build veya production APK'de tam çalışır.
- **Vision Türkçe matematik**: Llama 4 Scout Türkçe anlıyor ama bazen LaTeX formatı tutarsız; işlem sayısı çoksa adımları kısa kesiyor.

## Faz 3 Başarı Kriterleri

- [x] PDF upload → parse → chunk → embed → DB
- [x] Flashcard otomatik üretim + swipe onay
- [x] Kavram çıkarma AI listesi
- [x] Vision 5 task tipi çalışıyor
- [x] WhatsApp paylaşım intent + inbox
- [x] 3 worker paralel çalışıyor

## Sonraki — Faz 4 (Teaching Engine + Concept Map, ~4 hafta)

- 150 tekniğin tam seed'i (90+ kalan prompt_template + long_description)
- Teaching Engine: context-aware teknik seçimi (bandit algorithm)
- Subject + concept CRUD ekranları
- 2D concept map (react-native-svg force-directed)
- RAG: dokümandan soru sorma (pgvector similarity search)
- Tarama PDF için OCR desteği (Groq vision fallback)
- Onaylanan concept'ler pgvector'e embedded olarak işlensin
