# Kavra Modal Worker

Serverless YouTube transcribe worker. Whisper fallback için.

## Setup

```bash
pip install modal
modal token new
cd apps/worker-modal
modal deploy worker.py
```

Deploy çıktısında URL alacaksın:
```
✓ Deployed app
  https://YOUR_USER--kavra-yt-transcribe-transcribe.modal.run/
```

## Backend env

`apps/worker-llm/.env`:
```
MODAL_YT_TRANSCRIBE_URL=https://YOUR_USER--kavra-yt-transcribe-transcribe.modal.run/
```

## Maliyet

Modal Free tier: $30 credit/ay → ~500 saatlik video transcribe yeter.
Sonrası: GPU yok, CPU+RAM = ~$0.001/dakika video.
1000 Pro user × 30 dk video/ay = 30k dk/ay = $30/ay max.

Groq Whisper Large v3 Turbo: $0.04/saat → 30k dk = 500 saat = $20/ay.

Toplam Whisper fallback maliyeti: **~$50/ay 1000 user için**.

## Test

```bash
# Local test (Modal'dan remote function çağırır)
GROQ_API_KEY=gsk_xxx modal run worker.py --video-id dQw4w9WgXcQ
```

## Limitler

- 1 saatlik video limit (60 dakika max execution)
- 8GB RAM (kafi, audio-only küçük)
- Geçici dosyalar tempfile'da, sonunda silinir
- Telif haklı içerik: yt-dlp her zaman çalışmaz, age-restricted/private fail
