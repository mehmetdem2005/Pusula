# Faz 11 Sprint 4 — YouTube Transkript

> Notebook'a YouTube videosu eklenebiliyor, transkripti otomatik çekiliyor,
> zaman damgalı pasajlara bölünüyor, sohbet cevaplarında [3:24] gibi link gösteriliyor,
> tıklayınca YouTube player'da o saniyeye atlıyor.

## Bu sprintteki 5 sistem

### 1. DB Migration `0012_youtube_transcripts.sql`
- `youtube_translation_cache` — chunk-level çeviri cache (TR↔EN), unique(source_id, target_language)
- `notebook_sources` ekleme: `youtube_video_id`, `youtube_duration_seconds`, `youtube_channel_name`, `transcript_source`
- `video_playback_history` — last_position_ms, watched_seconds, is_completed (gelecekte "kaldığın yerden devam" için)

### 2. YouTube Transcript Lib `lib/youtube.ts`
**3-tier fallback strategy:**
1. **Supadata** `mode=auto` (primary) — $47/mo, 50k transcript request/ay, hem manual transcript hem ASR
2. **Public scraper** (youtubetranscript.com proxy) — Supadata yoksa, açık kaynak
3. **Whisper fallback** — Modal worker'a delege (yt-dlp + Groq Whisper Large v3 Turbo)

**Time-based chunking** — ~30 saniyelik bloklar, min 200 char, max 2000 char. Her chunk'ın `startMs/endMs` değeri var.

`extractVideoId` — youtube.com/watch?v=, youtu.be/, /embed/, /shorts/ tüm formatları regex parse.

### 3. Sources Route — YouTube extractor entegre
`processSource` içinde `youtube` branch:
- `fetchYouTubeTranscript` çağrısı
- Time-based chunking (page-based değil)
- OpenAI embeddings batch 32
- `start_time_ms/end_time_ms` chunk metadata olarak kaydedilir
- YouTube-specific kolonlar dolduruluur: `youtube_video_id`, `youtube_duration_seconds`, `youtube_channel_name`, `transcript_source`
- `transcript_source` field: hangi yöntemle alındı (UI'da rozet olarak göster)

Yeni endpoint: **`GET /api/sources/:id/chunks`** — source viewer için tüm chunk'ları sıralı döndürür.

### 4. Mobile YouTube Source Viewer `notebook/[id]/source/[sid].tsx`
- **`react-native-youtube-iframe` 2.3.0** ile gömülü oynatıcı (16:9)
- 500ms polling ile current time → `currentTimeMs` state
- Aktif chunk highlight + auto-scroll (FlatList yerine ScrollView + onLayout y position cache)
- Her chunk Pressable: tıklayınca `playerRef.seekTo(ms / 1000, true)` + auto play
- `transcript_source` rozet: "Resmi altyazı" / "Otomatik altyazı" / "Whisper transkripti"
- "Sor" butonu → ChatTab'a route

### 5. Mobile Citations Tıklanabilir
- `NotebookChatTab` içindeki citation card'lar artık YouTube source'lara link veriyor
- Source map'ten `source_type === 'youtube'` ve `start_time_ms != null` ise Pressable
- Tıklayınca `/notebook/:id/source/:sid` route'una git → o timestamp'te oynat (player otomatik o pozisyondan başlatabilir, gelecekte query param ile)
- Görsel: küçük play icon görünür, "active:opacity-70" feedback

### 6. NotebookSourcesTab — YouTube modal
- "YouTube" butonu artık aktif (Sprint 3'te disabled)
- URL validation: `youtube.com|youtu.be` regex
- Title opsiyonel
- Bilgilendirme: "Resmi altyazısı olan videolar saniyeler içinde, yoksa AI transkripti 1-2 dakika"
- Source row YouTube ise tıklanır → viewer'a yönlendirir

## Mimari Kararlar (Sprint 4)

### 3-tier fallback
Supadata $47/mo en hızlı + en kaliteli, ama sustainable değil tek başına. Açık scraper ücretsiz fakat rate-limited & flaky. Whisper en pahalı ama her zaman çalışır. Bu üçlü cascade ile hem maliyet hem güvenlik dengesi.

### Time-based chunking (page-based değil)
PDF'de "Sayfa 5" anlamlı ama YouTube'da değil. 30 saniyelik bloklar Whisper subtitle yaklaşımına yakın, ne çok küçük ne çok büyük. Embedding kalitesi ~700 token sweet spot'a yakın.

### Manuel transcript önceliği
Supadata `mode=auto` zaten en iyi mevcut transcript'i seçer (manual altyazı varsa onu, yoksa ASR). Manual altyazılar daha temiz noktalama, isim doğruluğu, yabancı kelime düzgünlüğü ile gelir.

### YouTube player iframe over native
`react-native-youtube-iframe` WebView üzerinde çalışır → maliyet 0, geliştirme hızı yüksek. Native Android player (Google PlayerService) reklam politikası karmaşık. iframe ad-supported ama YouTube'un orijinal davranışı.

### `webViewStyle: { opacity: 0.99 }` iOS hack
react-native-youtube-iframe iOS'ta bazen render edilmiyor — opacity 0.99 force render trigger.

### transcript_source UI rozet
Kullanıcıya transparency: "Otomatik altyazı" rozeti varsa "noktalama eksik olabilir" beklentisi ayarlanır. Whisper rozet → kalite yüksek ama biraz gecikti.

### Modal worker for Whisper fallback (defer)
`MODAL_YT_TRANSCRIBE_URL` env tanımlı ama worker yazılmadı. Production'a deploy ederken Modal'da yt-dlp + Groq Whisper script eklenir. Şimdilik 1 ve 2. tier (Supadata + scraper) yeterli.

### Çeviri cache (defer)
`youtube_translation_cache` tablosu yarattım ama çeviri toggle UI eklenmedi. Sprint 5'te "Çeviri" butonu → Gemini Flash ile chunk-level çeviri + cache.

## Maliyet (1000 Pro user/ay)

| Servis | Aylık |
|---|---|
| Sprint 3 baseline | $700-1050 |
| Supadata Pro plan | $47 |
| Whisper fallback (Groq, ~%5 video) | $5 |
| **Sprint 4 ek** | **$52** |
| **Toplam** | **~$750-1100** |

%80+ video Supadata ile çekilir → marjinal ek maliyet düşük.

## Yeni Env

```bash
# Worker-LLM
SUPADATA_API_KEY=...           # Supadata Pro plan
MODAL_YT_TRANSCRIBE_URL=...    # Optional, Modal worker (production'da)
```

## Yeni deps

```json
// apps/mobile/package.json
"react-native-youtube-iframe": "^2.3.0"
```

## Sanity

- Toplam dosya (no node_modules): **355**
- Yeni: 3 dosya (YouTube lib + viewer + migration)
- Edited: 5 dosya (sources.ts, NotebookSourcesTab, NotebookChatTab, _layout, render.yaml)
- API endpoints: 1 yeni (`/api/sources/:id/chunks`)
- Mobile route: 1 yeni (`/notebook/:id/source/:sid`)

## Test Akışı

1. Free user "YouTube" sekmesinden URL ekle (`youtube.com/watch?v=dQw4w9WgXcQ`)
2. ~30sn'de status: ready (resmi altyazı varsa)
3. Source'a tıkla → YouTube player + transkript scrollview
4. Bir cümleye tıkla → o saniyeye atlar, oynamaya başlar
5. Player oynarken aktif chunk highlight + auto-scroll çalışır
6. ChatTab'a dön, "Bu videodaki ana fikir ne?" sor
7. Cevapta `[[1]]` markerlar + alttaki citation'lar `[3:24] · Video başlığı` formatında
8. Citation card'a tıkla → tekrar viewer'a, o timestamp'e atla
9. Whisper fallback testi: çok eski / altyazısız bir Türkçe video dene → "Whisper transkripti" rozet görünür

## Bilinen Limitler

- **Live stream / premiere'ler** desteklenmiyor (henüz published video gerekir)
- **Age-restricted videos** Supadata bazen başaramaz → Whisper fallback'a düşer
- **2 saatten uzun videolar** Whisper fallback'ta yavaş (Modal worker ile parallel chunks gerek)
- **Otomatik dil tespiti** çalışıyor ama notebook dili ile uyuşmazsa LLM cevabı garip olabilir → kullanıcı manuel dil seçmesin diye notebook.language varsayılan kullanılır

## Sonraki Sprint Seçenekleri

### v1.1 polish
- Çeviri toggle (TR ↔ orijinal dil) — `youtube_translation_cache` zaten hazır
- Modal Whisper worker deploy (yt-dlp + Groq parallel chunks)
- "Kaldığın yerden devam" — `video_playback_history` UI
- Player yorum panel (NotebookLM video Q&A altında comments gibi)

### Sprint 5 — Yayın Hazırlık (~3 hafta)
- iOS App Store + Google Play
- RevenueCat (Apple/Google %30 protection)
- Multi-device sync
- AI image moderation (Türkçe NSFW filter)
- İletimerkezi Türkiye SMS provider

### Sprint 6 — v2 features
- ElevenLabs v3 `text_to_dialogue` Pro+ tier
- Video Overview (Remotion)
- Anthropic Citations API (gerçek API alıntıları, regex yerine)
- Slides .pptx export
- Mermaid WebView render
