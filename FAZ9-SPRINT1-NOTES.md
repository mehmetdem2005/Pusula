# Faz 9 Sprint 1 — Kitap Okuyucu + Tap-to-Translate + Vocabulary

> Linga'nın yaptığını yap, ama Kavra'nın 150 pedagojik tekniğiyle birleştir.
> Bu sprint: **EPUB reader + tap-to-translate + AI cümle çevirisi + kişisel kelime dağarcığı**.

## Bu sprintteki 8 sistem

### 1. Books DB & Storage
- `books` (kitap meta + ilerleme + status)
- `book_sentences` (preprocessed cümleler + audio cache)
- `book_bookmarks` (yer imleri)
- `reading_sessions` (oturum metrikleri)
- `books` storage bucket (private, user-scoped)
- `book-audio` storage bucket (public, shared TTS cache)

### 2. Dictionary 3-katmanlı
1. **`dictionary_cache`** — Postgres'te paylaşılan
2. **Free Dictionary API** — İngilizce için ücretsiz, IPA + tanım
3. **Gemini 2.0 Flash** — bağlamsal Türkçe çeviri (~$0.06/1k Pro user/ay)

`POST /api/dictionary/lookup` — tek kelime, Linga "made" popup'ı

### 3. Sentence Translation (AI Çeviri Pro)
- `sentence_translation_cache` (sha256 hash bazlı)
- **Gemini 2.0 Flash** (free) - hızlı, bağlam koruyucu
- **Gemini 2.5 Pro** (Pro tier "edebi mod") - üslup koruyucu
- Alternatifler + deyim/kayıt notları

### 4. Word Frequency
- `word_frequency` tablosu (En İyi 500/1000 — Linga özelliği)
- CEFR levels (A1, A2, B1, B2, C1, C2)
- Production'da kaikki/COCA dump'ı yüklenir

### 5. User Vocabulary
- `user_vocabulary` (kişisel kelime dağarcığı)
- Kelime + lemma + IPA + definitions + translations
- `source_book_id` + `source_sentence` (bağlam)
- Status: new/learning/reviewing/mastered/ignored
- Encounters counter
- SRS card link (Faz 9 sprint 2'de FSRS entegrasyonu)

### 6. EPUB Reader
- `@epubjs-react-native/core` (Linga seviyesi okuma deneyimi)
- Tap-to-select kelime yakalama → WordPopup
- Long-press cümle seçimi → SentenceTranslator
- Theme (light/sepia/dark)
- Font size slider (70-150%)
- CFI bazlı progress (cihazlar arası senk)
- Local cache (`expo-file-system`)

### 7. PDF Reader (sprint 2)
- `@kishannareshpal/expo-pdf`
- Page-based progress
- Text selection

### 8. Reading Sessions Tracking
- `start` → reading session id
- Progress every 30 saniye otomatik save
- `end` → wordsLookedUp + sentencesTranslated + wordsAddedToVocab metrikleri

## Mobile Ekranları

- `app/(tabs)/library.tsx` — Linga'nın "Ev" sekmesi (Devam Eden / Başlamamış / Tamamlanmış tabları + Proust quote)
- `app/library/add.tsx` — EPUB/PDF upload + dil seçimi
- `app/reader/[id].tsx` — EPUB reader (tema, font, progress, toolbar)
- `app/vocabulary.tsx` — Kişisel kelime dağarcığı (filter + status değiştirme)

## Components

- `WordPopup.tsx` — Linga'nın "made" popup'ı (IPA + Türkçe + tanım)
- `SentenceTranslator.tsx` — "AI ÇEVİRİ" pasaj çevirisi + edebi mod
- `ReaderToolbar.tsx` — Tema + font + bookmark + ara + içindekiler

## Maliyet (1000 Pro user/ay)

- Gemini Flash word lookups: ~$10-20
- Gemini Flash sentence translation (cached): ~$15-30
- Gemini Pro literary mode: ~$30-50
- Free Dictionary API: $0 (sınırsız)
- Storage (kitaplar): ~$10
- **Toplam: ~$60-110/ay = $0.06-0.11/user**

## Yeni Env

```bash
GEMINI_API_KEY=AIza...
```

## Kalan İşler (Sprint 2)

1. **TTS okuma + karaoke vurgu** — ElevenLabs `/with-timestamps` curated kitaplar için (audio-cache stratejisi)
2. **PDF reader** — `@kishannareshpal/expo-pdf` entegrasyonu
3. **SRS entegrasyonu** — `ts-fsrs` ile vocabulary cards
4. **Egzersizler ekranı** — Kartlar/Çoktan Seçmeli/Kelime Oluştur (Linga "Egzersizler" sekmesi)
5. **Word frequency ekranı** — "En İyi 500/1000" görünümü

## Faz 9 Sonraki Sprint'ler

- **Sprint 2 (1-2 hafta)**: TTS okuma + karaoke vurgu + PDF reader + SRS entegrasyonu
- **Sprint 3 (NotebookLM klonu, 3 hafta)**: Kaynak ingest + RAG chat + Sesli Özet (Gemini multi-speaker)
- **Sprint 4 (YouTube transkript, 1-2 hafta)**: Supadata + Whisper fallback + `[mm:ss]` citations
