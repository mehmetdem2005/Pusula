# 00 — Sesli Sohbet (Realtime) — Genel Bakış

> Omurga: **Gemini Live API** (mevcut `MANAGED_GEMINI_KEY`). Transport: tarayıcı ↔ **NestJS WS relay** ↔ Gemini Live.
> Hedef: kesilebilen (barge-in), düşük gecikmeli (ilk sese < ~800ms), Türkçe doğal realtime sohbet.

## Neden

Eski `/sesli`: Web Speech STT + Gemini TTS REST (cümle cümle) + SSE LLM → barge-in yok, streaming yok, gecikme yüksek, orb tema-dışı. Bkz. master plan "SESLİ SOHBET — ELİT REALTIME".

## Veri akışı (bir tur)

```
mic → getUserMedia(EC/NS/AGC) → AudioWorklet(PCM16 16k) → WS up → relay → Gemini realtimeInput
Gemini serverContent(PCM 24k)+transcript+interrupted → relay → WS down → playback scheduler → hoparlör
kullanıcı konuşunca → Gemini VAD → interrupted → playback flush (barge-in)
```

## Katmanlar (her biri ayrı doc)

- 01 backend live relay · 02 client audio capture · 03 playback+barge-in · 04 turn/VAD+state
- 05 orb/UX (skill) · 06 context+fallback · 07 rollout/test/cost

## Gecikme bütçesi (elit hedef)

ağ ~150ms + Gemini ilk ses ~300–500ms + playout buffer ~100ms ≈ **< ~800ms time-to-first-audio**.

## Rollout / flag / fallback

- `VOICE_LIVE_ENABLED` (web env) + tarayıcı yeteneği (AudioWorklet + WS) kontrolü.
- Live başarısız / key yok / desteksiz tarayıcı → **eski cascaded mod** (mevcut Web Speech + TTS REST) otomatik devreye girer. Kırılma yok.
- Kota: `VOICE_LIVE_MAX_MIN_PER_DAY` (kullanıcı/gün dakika kapağı, relay'de sayılır).

## Doğrulama (özet)

build yeşil → bağlan → konuş (<800ms ilk ses, Türkçe) → konuşurken kes (anında susar) → "en kelepir kayıtlı ilanım?" doğru → key kapalıyken cascaded'e düşer.
