# 01 — Backend: Gemini Live WS Relay

Amaç: tarayıcı ↔ relay ↔ Gemini Live köprüsü. API key SUNUCUDA kalır.

## Dosyalar

- `apps/api/src/main.ts` — `app.getHttpServer()` üzerine `ws` server attach, path `/v1/voice/live`.
- `apps/api/src/voice/gemini-live.client.ts` (YENİ) — Gemini Live WS istemcisi.
- `apps/api/src/voice/voice-live.gateway.ts` (YENİ) — relay: auth + köprü + kota.
- `apps/api/src/config/env.schema.ts` — `VOICE_LIVE_MODEL`, `VOICE_LIVE_MAX_MIN_PER_DAY`.
- Dep: `ws` (+ `@types/ws` dev).

## Gemini Live protokolü (pinned)

Endpoint: `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=<KEY>`
İlk mesaj (setup):

```json
{
  "setup": {
    "model": "models/<VOICE_LIVE_MODEL>",
    "generationConfig": {
      "responseModalities": ["AUDIO"],
      "speechConfig": { "languageCode": "tr-TR" }
    },
    "systemInstruction": { "parts": [{ "text": "<saved-context + persona>" }] },
    "realtimeInputConfig": {
      "automaticActivityDetection": {},
      "activityHandling": "START_OF_ACTIVITY_INTERRUPTS"
    },
    "inputAudioTranscription": {},
    "outputAudioTranscription": {}
  }
}
```

Yukarı (ses): `{"realtimeInput":{"audio":{"mimeType":"audio/pcm;rate=16000","data":"<b64>"}}}`
Aşağı: `serverContent.modelTurn.parts[].inlineData{mimeType:"audio/pcm;rate=24000",data}`,
`serverContent.inputTranscription.text`, `...outputTranscription.text`, `serverContent.interrupted`, `serverContent.turnComplete`, `setupComplete`.
Model default: `gemini-live-2.5-flash-native-audio` (env ile değişir; fallback `gemini-2.0-flash-live-001`).

## Tarayıcı ↔ relay protokolü (JSON, tek WS)

İstemci→relay: bağlantı `?token=<supabaseJWT>`; sonra binary frame = ham PCM16 16k (düşük overhead) VEYA `{"t":"audio","d":"<b64>"}`. Kontrol: `{"t":"end"}` (manuel tur sonu), `{"t":"bye"}`.
Relay→istemci: `{"t":"ready"}`, `{"t":"audio","d":"<b64 24k>"}`, `{"t":"in_tx","text":...}`, `{"t":"out_tx","text":...}`, `{"t":"interrupted"}`, `{"t":"turn_end"}`, `{"t":"error","m":...}`, `{"t":"quota"}`.

## Auth

WS handshake'te `Authorization` header tarayıcıdan güvenilir biçimde gönderilemez → token query param (`?token=`). Relay, Supabase JWT'yi doğrular (mevcut `jwt.guard`/supabase JWT secret mantığı reuse) → `userId`. Geçersizse 1008 close.

## Kota / maliyet

Bağlantı açılışında ve periyodik: kullanıcının bugünkü toplam Live dakikası (bellekte sayaç + opsiyonel `usage_events`); `VOICE_LIVE_MAX_MIN_PER_DAY` aşılırsa `{"t":"quota"}` + close. Oturum süresi sunucuda ölçülür.

## Yaşam döngüsü

open → JWT doğrula → kota → Gemini WS aç → setup gönder (systemInstruction = `lists.service.getSavedContext(userId)` özeti) → setupComplete → `{"t":"ready"}`. İki yön pipe. Taraflardan biri kapanınca diğerini kapat; hata → `{"t":"error"}`.

## Notlar

- Render WebSocket destekler. helmet/compression WS'i etkilemez (ayrı upgrade).
- `setGlobalPrefix('v1')` HTTP'ye ait; WS path'i elle `/v1/voice/live` veriyoruz.
- 15MB JSON limiti yalnız HTTP; WS ayrı.
