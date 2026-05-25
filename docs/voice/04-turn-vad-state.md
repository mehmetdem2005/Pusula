# 04 — Turn Detection / VAD + İstemci Durum Makinesi

## VAD / turn (sunucu tarafı = Gemini)

- Gemini `realtimeInputConfig.automaticActivityDetection` ile sunucu-VAD yapar; ekstra istemci VAD gerekmez.
- `activityHandling: "START_OF_ACTIVITY_INTERRUPTS"` → kullanıcı konuşunca asistanın sesi kesilir (barge-in).
- İnce ayar (gerekirse): `silenceDurationMs`, `startOfSpeechSensitivity`, `endOfSpeechSensitivity`.
- Manuel mod (ops.): otomatik VAD `disabled:true` + istemci `activityStart/activityEnd` — v1'de KULLANMA (otomatik yeterli).

## İstemci durum makinesi

`connecting → idle → listening → thinking → speaking → (idle)` + `error`.

- `connecting`: WS açılıyor / setup. `ready` gelince → `idle`.
- `listening`: mic açık, kullanıcı konuşuyor (in_tx geliyor / local RMS yüksek).
- `thinking`: turn kapandı, ilk audio gelmedi (kısa).
- `speaking`: audio çalıyor.
- `interrupted` → `listening`. `turn_end` + kuyruk boş → `idle`.
- WS close/err → `error` → (oto) cascaded fallback önerisi.

## Canlı altyazı

- `in_tx` → kullanıcının dediği (gri). `out_tx` → asistanın dediği (beyaz). Akarken biriktir; turn_end'de finalize.
- Orb altında 1–2 satır; uzun metin scroll/clip.

## Orb durum eşlemesi (bkz 05)

idle=yumuşak nabız, listening=dalga (mic RMS), thinking=dönüş, speaking=hız nabız.
