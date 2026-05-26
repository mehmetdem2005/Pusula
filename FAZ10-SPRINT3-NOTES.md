# Faz 10 Sprint 3 — NotebookLM Klonu (Sesli Özet, RAG, Studio)

> Kavra'ya NotebookLM'in tüm temel özelliklerini ekledik. Defter, çoklu kaynak,
> alıntılı RAG sohbet, Türkçe podcast, flashcard, quiz, slayt, infografik, özet.

## Bu sprintteki 8 sistem

### 1. DB Migration `0011_notebooks_and_studio.sql`
- `notebooks` (defter — emoji, renk, dil)
- `notebook_sources` (PDF/URL/audio/text/EPUB/YouTube)
- `source_chunks` — pgvector 1536d HNSW index
- `notebook_messages` — RAG chat with `citations` jsonb
- `generated_content` — 6 tip (audio_overview, flashcards, quiz, slides, summary, infographic)
- `podcast_scripts` — turn-by-turn diyalog
- 2 storage bucket: `notebook-sources` (private) + `notebook-outputs` (private)
- `recount_notebook_aggregates` RPC
- **`search_chunks_hybrid` RPC** — vector cosine + Postgres FTS (simple + unaccent), 0.7/0.3 weight

### 2. Notebooks CRUD Route `routes/notebooks.ts`
- Free tier: 3 aktif defter
- `last_accessed_at` otomatik güncellenir
- DELETE → storage cascade cleanup

### 3. Source Ingestion Route `routes/sources.ts`
- Upload signed URL (PDF/audio için)
- Free tier: 5 kaynak/defter
- **Extractors**:
  - `text` — doğrudan
  - `url` — Jina Reader (`https://r.jina.ai/`)
  - `pdf` — pdf-parse dynamic import
  - `audio` — Groq Whisper Large v3 Turbo (verbose_json)
  - `youtube` — Sprint 4'te
- **Chunking**: 2500 char (~700 token TR), 350 overlap, heading-aware (Markdown #)
- **Embeddings**: OpenAI text-embedding-3-small 1536d, batch 32
- Background processing `setImmediate` (queue altyapısı Sprint 5'te)

### 4. RAG Chat Route `routes/notebook-chat.ts`
- Embed query → `search_chunks_hybrid` (top 8) → LLM
- **Gemini 2.0 Flash primary** (Türkçe doğallık iyi, ucuz, JSON mode native, 1M context)
- **Groq Llama 3.3 70B fallback**
- System prompt'ta **`[[n]]` marker discipline**: kaynak dışı bilgi vermeme, kullanıcıya "kaynaklarda yok :/" der
- Citation parser regex `/\[\[(\d+)\]\]/g` → frontend için chunk_id+source_id+title+snippet+page_number+start_time_ms

### 5. Studio Generation Route `routes/studio.ts`
6 content type:
- **`audio_overview`** — 2-host TR podcast script (Ela kadın + Mert erkek, 12/20/32 turn)
  - Doğal Türkçe ("yani", "şöyle düşün")
  - Sayıları sözel yaz
  - İngilizce loanword'leri Türkçeleştir
  - **Pro-only** (en pahalı: ~$0.12/podcast)
- `flashcards` — 70% Q&A + 30% cloze, atomik, Bloom 40/40/20
- `quiz` — 4 seçenek (1 doğru + 3 distractor: yaygın yanılgı + anlamsal yakın + yüzeysel) + 1-2 cümle açıklama
- `slides` — title/bullet/quote/comparison/closing layouts + 30-60sn speakerNotes
- `infographic` — Mermaid markdown (flowchart/mindmap/timeline/sequence/pie), TR karakterler çalışır
- `summary` — title + 3-5 paragraf + 5-8 anahtar nokta
- Free aylık 10 üretim limit

### 6. Podcast Synthesis Route `routes/podcast-synthesis.ts`
- Edge TTS multi-speaker pattern (Gemini 3.1 Flash multi-speaker `tr-TR` henüz preview)
- A=Emel kadın, B=Ahmet erkek (TR/EN/DE/FR/ES/JA voice map)
- **Manifest pattern**: tek mp3 yerine her turn ayrı segment
  - `manifest.json` (offset, durationMs, speaker, text, storagePath)
  - Frontend sırayla oynatır (skip kontrolü iyi UX)
- 200ms inter-turn pause
- TODO: production'da ffmpeg/lavfi ile tek mp3 (Modal worker)

### 7. Mobile useNotebooks Hook `useNotebooks.ts`
TanStack Query hooks, processing state için auto-refetch 3s:
- `useNotebooks`, `useNotebook`, `useCreateNotebook`, `useUpdateNotebook`, `useDeleteNotebook`
- `useUploadSource`, `useCreateSource`, `useDeleteSource`
- `useNotebookMessages`, `useNotebookChat`, `useClearChat`
- `useGenerateContent`, `useGeneratedContent`, `useDeleteGenerated`
- `useSynthesizePodcast`, `usePodcastManifest`

### 8. Mobile UI — 4 ekran + 3 tab component
- **`app/notebooks.tsx`** — NotebookLM-style grid + emoji + renk + FAB
- **`app/notebook/new.tsx`** — emoji 14 + renk 8 + 5 dil + canlı preview
- **`app/notebook/[id].tsx`** — 3-tab (Sources/Chat/Studio) + custom header
- **`NotebookSourcesTab`** — file picker (PDF/audio/EPUB) + text input modal + URL modal + processing/error states
- **`NotebookChatTab`** — RAG chat UI + KeyboardAvoidingView + suggestion chips + `[[n]]` superscript pills + citation cards (page/timestamp)
- **`NotebookStudioTab`** — 6 CreateCard + üretilen içerik listesi
- **`app/notebook/[id]/studio/[sid].tsx`** — detail viewer with:
  - **PodcastPlayer**: auto-trigger synthesize, segment-by-segment Audio.Sound + auto-advance + transcript scrollview with click-to-seek
  - **FlashcardsViewer**: tap to reveal + prev/next nav
  - **QuizViewer**: 4 options A/B/C/D + score tracking + explanation reveal + finish screen
  - **SlidesViewer**: 4 layout types + speakerNotes + prev/next
  - **SummaryViewer**: prose + key points
  - **InfographicViewer**: raw Mermaid (TODO: WebView render)

## Mimari Kararlar (Sprint 3)

### Gemini 2.0 Flash primary LLM
Türkçe doğallık iyi, ucuz ($0.06/lookup), JSON mode native, 1M context. Groq Llama 3.3 70B fallback (Gemini quota dolarsa).

### Multi-speaker Edge TTS pattern
Gemini 3.1 Flash multi-speaker TR-TR henüz preview. Geçici olarak Edge TTS ile A/B speakers ayrı synthesize + manifest pattern. Production'da Gemini 3.1 stable çıkınca migrate.

### Manifest pattern over single mp3
Frontend sırayla segment oynatır, skip kontrolü iyi UX. Tek mp3 için ffmpeg worker gerekirdi (Modal). MVP için fazla mühendislik.

### Hybrid search
pgvector cosine (0.7) + Postgres FTS simple+unaccent (0.3) RPC içinde. Türkçe FTS config olmadığı için simple yeterli — unaccent ile "öğrenme/ogrenme" eşleşir.

### Citation `[[n]]` markers
Anthropic Citations API yerine custom regex parser (Groq'ta Citations API yok). Frontend superscript pill render. Bilinçli, basit, taşınabilir.

### Background processing setImmediate
Render Standard plan worker yeterli, separate queue (BullMQ/Inngest) Sprint 5'te.

### Free tier eşikleri
- 3 aktif defter
- 5 kaynak/defter
- 10 üretim/ay
- audio_overview Pro-only (en pahalı feature)

Pro $4.99 anlamlı atlama yapsın.

### chunk_count = 2500 char (~700 token TR)
Türkçe agglutination subtoken yüzünden — İngilizce 700 token=2800 char ama TR'de 2500'de aynı bilgi sığar.

## Maliyet (1000 Pro user/ay)

| Servis | Aylık |
|---|---|
| Sprint 1+2 baseline (Edge TTS, FSRS, sözlük) | $75-170 |
| OpenAI embeddings (text-embedding-3-small) | $3 |
| Gemini 2.0 Flash chat (~50k Q&A) | $138 |
| Studio gen (~50k flashcard/quiz/slide) | $50 |
| Audio overview (Gemini script + Edge TTS, 5/Pro/ay) | $300-600 |
| Storage (notebook-outputs) | $30 |
| Render compute artışı | $25 |
| **Sprint 3 ek** | **$580-870** |
| **Toplam değişken altyapı** | **~$700-1050** |
| **= $0.70-1.05/user/ay** | |

Pro $4.99/ay → **~%80-85 marj**.

## Yeni Env

```bash
# Worker-LLM
GEMINI_API_KEY=...        # Sprint 1'de eklendi
OPENAI_API_KEY=...        # Faz 4'te eklendi (embeddings için)
GROQ_API_KEY=...          # Sprint 1'de eklendi (Whisper + LLM fallback)
JINA_API_KEY=...          # OPSIYONEL — free tier without key works
```

## Kalan İşler

### v1.1 (defer)
- Mermaid WebView render (gerçek diyagram, TR karakterler)
- ElevenLabs v3 `text_to_dialogue` Pro+ tier (emotion tags, kahkaha)
- Slides .pptx export (`pptxgenjs`)
- Anthropic Citations API integration (Pro tier)
- Remotion video overview
- Gemini 3.1 Flash multi-speaker TTS migrate (Türkçe stable çıkınca)

### Sprint 4 — YouTube Transcript (~2 hafta)
- Supadata `mode=auto` ($47/mo) + Groq Whisper fallback
- `[mm:ss]` clickable citations regex parser
- `react-native-youtube-iframe` 2.3.0 player.seekTo
- Long video (>90 dk) chunked RAG
- Türkçe-İngilizce orijinal/çeviri toggle (lazy translate + cache)

### Sprint 5 — Yayın (~3 hafta)
- iOS App Store + Google Play
- RevenueCat (Apple/Google %30 koruma)
- AI image moderation (Türkçe NSFW filter)
- Multi-device sync
- İletimerkezi Türkiye SMS provider
- Threads/Instagram standalone API

## Sanity

- Toplam dosya (no node_modules): **351**
- Yeni: 14 dosya
- Migration: 1 (0011)
- API endpoints: 14 yeni (`/api/notebooks/*`, `/api/sources/*`, `/api/studio/*`, `/api/podcast/*`)
- Mobile route: 4 yeni (`/notebooks`, `/notebook/new`, `/notebook/:id`, `/notebook/:id/studio/:sid`)

## Test Akışı (yayında doğrulamak için)

1. Free user notebook oluştur → 3. denemede limit hatası ✓
2. PDF yükle (10MB makale) → ~30sn'de ready ✓
3. Sohbet aç, "ana fikri ne?" sor → cevap içinde `[[1]]` markerlar + alttaki citation cards görünür ✓
4. Studio → flashcards üret → 15 kart, %70 Q&A %30 cloze ✓
5. Quiz üret → 10 soru, 4 seçenek + açıklama ✓
6. Pro user için: audio_overview üret → manifest hazır → segment by segment Türkçe podcast ✓
7. Free user audio_overview deneyince → Pro Required modal ✓
