# 03 — Client: Playback Scheduler + Barge-in

Dosya: `apps/web/lib/voice-live.ts` (playback bölümü).

## 24k PCM gapless playback (Web Audio scheduling)

- Ayrı `AudioContext` (playback) — capture'dan bağımsız; çıkış 24kHz.
- Her `{"t":"audio"}` (b64 PCM16 24k) → Int16→Float32 → `AudioBuffer(1ch, n, 24000)`.
- **Zamanlama kuyruğu:** `nextStartTime` tut; her buffer'ı `BufferSource.start(nextStartTime)`; `nextStartTime += buffer.duration`. `nextStartTime < ctx.currentTime` ise `ctx.currentTime + 0.05` (50ms playout buffer) ile resenkron.
- Gapless: parçaları sırayla zamanlayınca aralıksız çalar. Aktif source'ları `sources[]` listesinde tut.

## Barge-in / interrupt

- `{"t":"interrupted"}` veya kullanıcı yeni konuşmaya başladı sinyali → **flush**: tüm `sources[]` `.stop()`, listeyi boşalt, `nextStartTime = 0`. Ses anında susar.
- Gemini `START_OF_ACTIVITY_INTERRUPTS` ile kullanıcı konuşunca otomatik interrupt üretir; relay iletir.

## Durum bağlama

- İlk audio çalmaya başlayınca → state `speaking`.
- `turn_end` + kuyruk boşaldı → `idle`/`listening`.

## Mobil/iOS

- AudioContext kullanıcı jesti (tap) ile `resume()` edilmeli (autoplay politikası).

## Doğrulama

Cevap akarken konuş → ses < ~200ms içinde kesilir; yeni cevap başlar. Çıtırtı/üst üste binme olmamalı (nextStartTime doğru).
