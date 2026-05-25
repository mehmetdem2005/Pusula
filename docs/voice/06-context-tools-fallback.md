# 06 — Context (saved-context) + Model + Fallback

## System instruction (kayıtlı ilanlar)

- Relay, setup'ta `systemInstruction` = persona + `lists.service.getSavedContext(userId)` özeti (tüm listeler + Favorilerim'deki ilanlar, skor/etiket). Mevcut `/sesli` ve `/asistan` context'iyle aynı veri.
- Sesli persona: KISA, sohbet dili, markdown yok, 2–3 cümle (eski sesli sistem promptu korunur).
- Skoru DEĞİŞTİRME, yalnız yorumla.

## Model

- `VOICE_LIVE_MODEL` env (default `gemini-live-2.5-flash-native-audio`). Türkçe için `speechConfig.languageCode="tr-TR"`.
- Tool-use v1'de YOK (native audio modeli; ileride function-calling eklenebilir).

## Fallback (graceful) — KRİTİK

Aşağıdakilerden biri olursa **eski cascaded mod** devreye girer (mevcut Web Speech STT + `/v1/voice/tts` + `chatStream`):

- `VOICE_LIVE_ENABLED` kapalı, ya da `MANAGED_GEMINI_KEY` yok (relay `ready` yerine error).
- Tarayıcı AudioWorklet/WS desteklemiyor.
- WS bağlanamıyor / setup başarısız / kota dolu.
  İstemci: önce Live dener; ilk `ready` gelmezse / WS error → cascaded'e düş + kullanıcıya sessiz geçiş (küçük not). Eski kod `sesli/page.tsx` içinde `lib/voice.ts` + `lib/api.ts` ile korunur (silinmez).

## Doğrulama

Live açık → tam akış. `VOICE_LIVE_ENABLED=false` → cascaded çalışır, kırılma yok.
