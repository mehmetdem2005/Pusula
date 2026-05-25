# 02 — Client: Audio Capture (mic → PCM16 16k)

Dosyalar: `apps/web/public/voice-capture.worklet.js` (YENİ), `apps/web/lib/voice-live.ts` (capture bölümü).

## getUserMedia kısıtları

```js
navigator.mediaDevices.getUserMedia({
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    channelCount: 1,
    sampleRate: 48000,
  },
});
```

EC/NS/AGC zorunlu (hoparlör sesinin mic'e dönmesini önler → barge-in doğru çalışır).

## AudioWorklet (downsample → PCM16)

- `AudioContext` (genelde 48k) → `MediaStreamSource` → `AudioWorkletNode('voice-capture')`.
- Worklet: gelen Float32 (48k) → 16k'ya **decimate** (basit ortalama/lineer) → Int16 PCM → `port.postMessage(ArrayBuffer)` (transferable).
- Frame ~20ms (16k'da 320 sample). Ana thread base64'ler ve WS'e yollar (veya binary gönderir).
- ScriptProcessor KULLANMA (deprecated, jitter). Worklet ayrı thread → düşük gecikme.

## Akış kontrolü

- `mic on` → worklet mesajları WS'e akar (sürekli; Gemini VAD turn'ü belirler).
- `mic off` / mute → worklet'i sustur (port flush), capture node disconnect.
- Cihaz seçimi (v1 ops.): `enumerateDevices()` → `deviceId` ile getUserMedia.

## Temizlik

unmount/bye: tracks.stop(), worklet.disconnect(), AudioContext.close().

## Doğrulama

Konuşunca relay `in_tx` (giriş transkripti) gelmeli; sessizlikte ses gönderimi devam etse de Gemini turn açmaz.
