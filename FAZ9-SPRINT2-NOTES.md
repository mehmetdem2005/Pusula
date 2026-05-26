# Faz 9 Sprint 2 — TTS Karaoke + FSRS-5 SRS + Egzersizler

> Sprint 1'in üstüne kelime öğrenme döngüsünü tamamladı.
> **Edge TTS okuma + ElevenLabs karaoke vurgu + FSRS-5 + Egzersiz türleri**.

## Bu sprintteki 8 sistem

### 1. TTS Karaoke Audio (book reader)
- `routes/book-tts.ts` — sentence-level TTS + word timings
- **Edge TTS** (free) — Microsoft neural sesler, word timing tahmini
- **ElevenLabs `/with-timestamps`** (Pro) — character→word grouping ile gerçek karaoke alignment
- `book-audio` storage cache, sha256(text|voice|lang) anahtarı ile shared
- `KaraokeTTSPlayer.tsx` — word highlight + speed cycle (0.75x→2x)

### 2. FSRS-5 Spaced Repetition
- `lib/fsrs.ts` — sıfır deps, ts-fsrs v5 default w-vector
- 17 ağırlıklı w array, request_retention 0.9, max_interval 36500g
- `vocabulary_srs` tablosu — her kelime + card_type (recognition/production/cloze/listening)
- `vocabulary_review_log` — algoritma debug için snapshot
- `user_fsrs_params` — gelecekte kişiselleştirilmiş w optimization için

### 3. Vocab Review Routes
- `GET /api/vocab-review/due` — bugünün kartları
- `GET /api/vocab-review/queue` — mixed (80% due + 20% new)
- `POST /api/vocab-review/:cardId/rate` — 4-button FSRS (Again/Hard/Good/Easy)
- `GET /api/vocab-review/preview/:cardId` — interval önizlemesi
- `GET /api/vocab-review/stats` — heatmap + retention oranı

### 4. Exercises Screen (Linga "Egzersizler")
- `app/exercises.tsx` — 6 egzersiz türü kartları
- 7 günlük weekday strip (Pa-Sa-Ça-Pe-Cu-Ct-Pz) heatmap
- "Aralıklı Öğrenme" + "Karışık Tekrar"
- Egzersiz türleri: Kartlar, Çoktan Seçmeli (Pro), Kelime Oluştur, Boşluk Doldurma, Dinleme (Pro)

### 5. Vocab Review Session
- `app/exercises/review.tsx` — flashcard 4-button rating UI
- Reveal animation (anlam kartı flip)
- Source sentence bağlam kartı
- KaraokeTTSPlayer entegre (Edge TTS ile kelime sesli)
- 4 buton interval preview ("3g", "1ay", "5ay", "1.2y")
- Session stats (✓ doğru / ❌ tekrar)

### 6. TTS Settings
- `book_tts_settings` tablosu (engine, voice_id, speed, pitch, highlight_color/mode, auto_advance)
- `GET/PUT /api/books/tts/settings`

### 7. Daily Progress Tracking
- `vocabulary_daily_progress` — günlük öğrenme/tekrar/egzersiz/dakika
- Heatmap için kaynak

### 8. Worker-LLM'e Edge TTS taşındı
- `apps/worker-llm/src/edge-tts.ts` (worker-voice'tan kopya)
- worker-llm now self-contained TTS yapabiliyor
- ws + @types/ws deps eklendi

## DB Migration

`0010_tts_fsrs_exercises.sql` (~190 satır):
- `vocabulary_srs` (FSRS-5 schedule)
- `vocabulary_review_log` (history)
- `user_fsrs_params` (kişisel w-vector)
- `book_tts_settings`
- `exercise_sessions` (Linga 6 egzersiz tipi)
- `vocabulary_daily_progress` (heatmap)
- `upsert_vocab_srs_card` RPC

## Mimari Kararlar

### FSRS-5 sıfır deps
ts-fsrs npm paketini içe aktarmak yerine, basit ve okunabilir bir TypeScript implementasyonu yazıldı (~150 satır). Production'da 1000+ inceleme sonrası kişisel w optimization gerekirse ts-fsrs paketi import edilebilir, ama şimdilik default w yeterli.

### Edge TTS worker-llm'e taşındı
Daha önce worker-voice'a aitti. Sözlük + çeviri + TTS aynı router'da olduğu için API tutarlılığı arttı. Worker-voice eski ses klonu/synthesize endpoint'lerinde kalmaya devam ediyor.

### Word timing estimation Edge TTS için
Edge TTS resmi olarak word boundary event vermiyor. Toplam süre / karakter sayısı ile lineer tahmin yapılıyor — gerçek karaoke alignment için ElevenLabs Pro şart. Free user'lara highlight gösterilirse "yaklaşık" bir vurgu olur.

### Cache key = sha256(text|voice|lang)
Curated katalog kitaplarında aynı cümlenin TTS'i bir kez üretilip tüm kullanıcılar arasında paylaşılır. Pro tier'da audio storage marjinal maliyet sıfır.

### 80/20 mixed queue
Yeni kelime ratio default 0.2 (kullanıcı override edebilir). FSRS olgunlaşmış kullanıcılar için bu yeterli; başlangıçta daha çok yeni kelime gelir doğal olarak.

### Auto-create new cards
`/queue` endpoint'i yeni vocabulary için otomatik SRS card oluşturur. Kullanıcı manuel "kart oluştur" akışıyla uğraşmaz, sadece kelime öğreniyor.

## Maliyet (1000 Pro user/ay)

- Sprint 1 baseline: ~$60-110
- Edge TTS (free): $0 (Microsoft public API)
- ElevenLabs Pro karaoke: ~$5-50 (kullanım bazlı, sadece Pro)
- Storage (audio cache, paylaşılan): ~$10
- **Sprint 2 toplam: ~$75-170/ay = $0.08-0.17/user**

## Yeni Env

```bash
# Sprint 1'den ELEVENLABS_API_KEY zaten vardı
# Yeni env yok
```

## Mobile Yeni Ekranlar/Component

- `app/exercises.tsx` — Linga "Egzersizler" sekmesi
- `app/exercises/review.tsx` — FSRS flashcard session
- `components/reader/KaraokeTTSPlayer.tsx` — TTS + word highlight
- `hooks/useBookTTS.ts` — synthesize sentence, prefetch chapter, settings
- `hooks/useVocabReview.ts` — due, queue, rate, preview, stats

## Kalan İşler (Sprint 3'te NotebookLM ile birlikte)

1. **PDF reader** — `@kishannareshpal/expo-pdf` (placeholder var, full implementation Sprint 3)
2. **EPUB auto-read mode** — sentence-by-sentence advance + auto highlight
3. **Reader Toolbar TTS settings** — engine/voice/speed picker
4. **Egzersiz alt route'ları** — flashcard.tsx, multiple-choice.tsx, word-formation.tsx, cloze.tsx, listening.tsx, mixed.tsx (review.tsx bütün queue'yu zaten handle ediyor; alt route'lar tipi filtre'lemek için)
5. **Exercise sessions logging** — exercise_sessions tablosunu doldur

## Sprint 3 Plan (NotebookLM Klonu)

- Multi-source ingest (PDF/URL/audio/YouTube)
- RAG chat with citations (`[[n]]` markers)
- **Sesli Özet** — Gemini 3.1 Flash multi-speaker `tr-TR` Türkçe podcast (~$0.12/podcast)
- Auto Flashcards (LLM-generated SRS cards)
- Auto Quiz (MCQ + short answer)
- Slides (JSON → carousel + .pptx export)

## Sprint 4 Plan (YouTube Transcript)

- Supadata `mode=auto` ($47/mo)
- Groq Whisper Large v3 Turbo fallback ($0.04/saat)
- `[mm:ss]` regex parser → clickable timestamp pills
- `react-native-youtube-iframe` 2.3.0 player + seekTo
- Long video chunked RAG (>90 dk)
