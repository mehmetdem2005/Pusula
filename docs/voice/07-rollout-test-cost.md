# 07 — Rollout / Test / Cost

## Env

Backend (Render):

- `VOICE_LIVE_MODEL` = `gemini-live-2.5-flash-native-audio` (ops; default kodda).
- `VOICE_LIVE_MAX_MIN_PER_DAY` = `30` (kullanıcı/gün dakika kapağı).
- Reuse: `MANAGED_GEMINI_KEY` (zaten var).
  Web (Vercel):
- `NEXT_PUBLIC_VOICE_LIVE_ENABLED` = `1` (kapatınca cascaded'e düşer).
- `NEXT_PUBLIC_API_BASE_URL` zaten var → WS host bundan türetilir (`http→ws`, `https→wss`).

## Feature flag

`NEXT_PUBLIC_VOICE_LIVE_ENABLED !== '1'` → doğrudan cascaded mod. Açıkken Live dener, başarısızsa cascaded.

## Maliyet

Gemini Live ~$0.025/dk. Kapak: `VOICE_LIVE_MAX_MIN_PER_DAY` (relay sayar). İleride `usage_events`'e dakika yaz.

## QA / test

- Lokal build: `pnpm --filter @pusula/api build && pnpm --filter @pusula/web build` + `typecheck && lint`.
- Manuel: bağlan → konuş (<~800ms ilk ses, Türkçe doğru) → konuşurken kes (anında susar) → "en kelepir kayıtlı ilanım?" doğru → uzun sessizlik → idle.
- Fallback: `NEXT_PUBLIC_VOICE_LIVE_ENABLED=0` → cascaded.
- Mobil: iOS tap→AudioContext.resume; Android Chrome duplex.
- Gecikme ölç: ilk audio frame zamanı - turn sonu (console.time).

## Deploy

branch → main FF → Render (WS destekler) + Vercel auto. `/health` 200 + `/sesli` Live modda. Render env'e VOICE\_\* eklenmesi (gerekirse) — default'lar kodda olduğundan zorunlu değil.
