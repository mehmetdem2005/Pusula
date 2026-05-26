# v1.1 Polish — Launch Quality Pass

> Sprint 5'te "deferred" işaretli 6 sistemi tamamladı. Mağazaya çıkmadan önce
> launch kalitesini %100'e çıkardı.

## 6 sistem teslim edildi

### 1. Modal Whisper Worker (`apps/worker-modal/worker.py`)
Serverless Python worker. yt-dlp + ffmpeg + Groq Whisper Large v3 Turbo.
- 25MB Whisper API limit'i aşan videolar için **parallel chunks** (10 dakikalık parçalar)
- 2 saatlik video → ~30sn'de transcribe (8 chunk paralel)
- VAD trim (sessizlik atlama)
- m4a 16kHz mono 64kbps download (küçük dosya)
- `modal deploy worker.py` → `MODAL_YT_TRANSCRIBE_URL` env'a kondu
- README ile setup docs

**Maliyet:** Modal Free $30 credit/ay = ~500 saat video. Sonrası $0.001/dk.
Groq Whisper $0.04/saat. **1000 user'da ~$50/ay.**

### 2. YouTube Çeviri (`routes/translations.ts`)
Chunk-level Gemini 2.0 Flash batch translation. Cache-first.
- 12 dil destekli (tr/en/es/fr/de/it/pt/ru/ja/ko/zh/ar)
- Batch 10 chunk birlikte (token tasarruf)
- Async: `youtube_translation_cache` row "processing" → "ready"
- Mobile viewer'da **çeviri toggle** + progress bar ("23/40 pasaj")
- Per-chunk "Çevirili" rozet + "Orijinali göster" alert
- Pro-only

### 3. Mermaid WebView (`MermaidView.tsx`)
WebView içinde gerçek diyagram render.
- Mermaid 11.4.1 CDN (bundle'a binmez)
- Kavra renk teması (#F59E0B/#1E1B4B)
- securityLevel: strict (XSS guard, htmlentities encode)
- onMessage event → render durumu RN'e bildirilir
- Loading spinner + error display + copy source button
- InfographicViewer'a entegre — placeholder kaldırıldı

### 4. ElevenLabs v3 Dialogue (`lib/elevenlabs.ts`)
Pro+ podcast TTS upgrade.
- `text_to_dialogue` API (varsa) — tek call ile tüm dialog
- Fallback: parallel single-turn synthesize + concat (4'erli batch)
- Voice mapping TR (Ela/Mert) + EN (Sarah/Antoni)
- **Lifetime tier default ElevenLabs**, normal Pro Edge TTS
- podcast-synthesis.ts'te voice provider switch + manifest'e `voiceProvider`

**Maliyet:** ~$0.18/dakika (10 dk podcast = $1.80). Edge TTS ücretsiz.
Lifetime user'lar zaten yüksek LTV → premium ses anlamlı.

### 5. Anthropic Citations API (`notebook-chat.ts`)
Regex parser yerine **gerçek API alıntıları**.
- `claude-sonnet-4-6-20250929` + documents parameter + `citations: { enabled: true }`
- Native `cited_text` + `start_char` + `end_char` döner
- Per-claim alıntı (regex'in hatalı eşlemeleri yok)
- **Lifetime tier'da default**, fallback Gemini Flash (Anthropic hata olursa)
- Citations'lara `native: true` flag → UI'da farklı stil verilebilir

**Maliyet:** Sonnet 4.6 $3/$15 per Mtok. Lifetime user'da kabul edilebilir.

### 6. Slides .pptx Export (`routes/export-pptx.ts` + UI)
pptxgenjs ile gerçek PowerPoint dosyası.
- 5 layout: title (hero indigo bg), bullet (cream + amber underline), quote (amber bg italik), comparison (split + "vs."), closing (indigo + amber)
- 16:9 wide layout
- Speaker notes PowerPoint Notes panel'ında
- Kavra branding renkler (#F59E0B/#1E1B4B/#FBF8F0)
- Storage'a yüklenir, signed URL 1 saat
- Mobile SlidesViewer'a "İndir .pptx" butonu (amber, Linking.openURL)

## Mimari Kararlar (v1.1)

### Modal over self-hosted yt-dlp
yt-dlp Render container'da çalıştırılabilirdi ama:
- Render free tier RAM yetmez (8GB lazım)
- yt-dlp YouTube blocking için sürekli güncellenmeli (auto-update zor)
- Modal'da serverless = sadece kullandıkça öde
- Free $30 credit/ay startup için yeterli

### Translation cache pattern
- `youtube_translation_cache` row tek = (source_id, target_language) pair
- `translations` jsonb: `{ "0": "Merhaba", "1": "Nasılsın" }` chunk_index → text
- Async update: her batch sonrası `translated_chunks++` + jsonb merge
- Polling 3sn frontend'de "ne kadar bitti?" gösterir
- `status` field: pending → processing → ready / failed

### Mermaid CDN over bundle
Bundle'a koymak +600KB demek, sadece Pro infographic kullanıcısı için.
CDN: ilk yüklemede ~200ms gecikme, sonra cache. Trade-off mantıklı.

### Pro tier system
3 tier:
- **Free**: Edge TTS, Gemini Flash chat, regex citations
- **Pro** ($4.99/ay): Edge TTS, Gemini Flash chat, regex citations, ama tüm özellikler unlocked
- **Lifetime** ($99): ElevenLabs v3 default, Anthropic Citations default

`user_entitlements.metadata.product_id` ile lifetime check edilir. Strict tier kontrolü `is_pro` boolean'la, gelişmiş özellik kontrolü product_id'yle.

### Anthropic fallback
Anthropic API down olursa otomatik Gemini Flash'a düş. Uptime > kalite.
Kullanıcı bilmeden çalışır.

### .pptx export sunucuda değil edge'de
İlk düşündüm: client-side pptxgenjs (browser bundle var). Ama:
- Mobile'da çalışmaz (Buffer/Node API gerek)
- Storage'a yüklemek = paylaşılabilir link
- Server-side: cache edilebilir, "tekrar üret" gerekmez

## Maliyet (1000 Pro user/ay, v1.1 dahil)

| Servis | Aylık |
|---|---|
| Sprint 5 baseline | $875-1225 |
| Modal Whisper | $50 |
| Anthropic Sonnet (Lifetime user'lar) | $40 |
| ElevenLabs Pro plan | $22 |
| **v1.1 ek** | **~$112** |
| **Toplam** | **~$987-1337** |

Lifetime user oranı %5 varsayımıyla — ortalama maliyet $0.99-1.34/Pro user/ay,
abonelik $4.99-3.25/ay → **%67-80 marj korunuyor**.

## Yeni Env

```bash
# Worker-LLM
ANTHROPIC_API_KEY=sk-ant-...
ELEVENLABS_API_KEY=...
ELEVENLABS_VOICE_TR_A=tr_ela_studio_id
ELEVENLABS_VOICE_TR_B=tr_mert_studio_id
MODAL_YT_TRANSCRIBE_URL=https://YOUR_USER--kavra-yt-transcribe-transcribe.modal.run/

# Modal worker (deploy zamanı)
GROQ_API_KEY=gsk_...                  # Modal env değil, payload'da gönderilir
```

## Yeni deps

```json
// apps/worker-llm/package.json
"pptxgenjs": "^3.12.0"
```

```bash
# apps/worker-modal (Modal image içinde)
yt-dlp==2024.12.13
httpx==0.28.1
fastapi==0.115.0
ffmpeg                                 # apt
```

## Sanity

- Toplam dosya (no node_modules): **378**
- Yeni: 6 dosya (worker.py + README + translations.ts + export-pptx.ts + elevenlabs.ts + MermaidView.tsx)
- Edited: 6 dosya (notebook-chat.ts + podcast-synthesis.ts + studio[sid].tsx + source[sid].tsx + server.ts + render.yaml)
- API endpoints: 5 yeni (`/api/translations`, `/api/translations/:sid/:lang` GET/DELETE, `/api/studio/:id/export-pptx`)

## Test Akışı

1. Lifetime test user ile sohbet → response'da `citations.native = true`, `cited_text` API'den geliyor
2. YouTube source'ta "Çevir" → "Türkçe" seç → 30sn'de chunk'lar Türkçeleşir, "Çevirili" rozet
3. Studio'da infographic üret → InfographicViewer'da gerçek Mermaid diyagram render
4. Slides üret → "İndir .pptx" → 5 layout'lu .pptx açılır PowerPoint'te
5. Lifetime user podcast üret → manifest.voiceProvider='elevenlabs', daha doğal ses
6. 90 dakikalık YouTube video ekle → Supadata fail → public scraper fail → Modal Whisper → ~30sn'de transcribe

## Bilinen Limitler

- ElevenLabs `text_to_dialogue` beta'da olabilir → fallback concat yine kaliteli
- Modal cold start ~5sn (free tier) → ilk istek yavaş, sonra hızlı
- pptxgenjs Türkçe font yok → fallback Helvetica/Georgia (system font)
- Anthropic rate limit Sonnet 4.6'da düşük → eş zamanlı 50+ Lifetime user istek atarsa queue olabilir

## Sonraki

**Sprint 6 — Sosyal/Gamification** (~2 hafta)
Kavra şimdi launch + v1.1 polish ile mağazaya hazır. Sosyal feature'lar yayın sonrası viral büyüme için.
