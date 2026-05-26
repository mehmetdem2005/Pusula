# Modal F5-TTS Deployment

Kavra'nın voice cloning özelliği Modal.com üzerinde A10G GPU'da çalışan F5-TTS modelidir.

## Hızlı Başlangıç

```bash
# 1. Modal CLI kurulumu (bir defa)
pip install modal
modal setup

# 2. Secret tanımla (opsiyonel, internal API token için)
modal secret create kavra-secrets

# 3. Deploy
cd infra/modal
modal deploy modal_f5tts.py
```

Deploy sonrası 2 endpoint URL'si verilir:
- `https://<workspace>--kavra-f5tts-synthesize.modal.run` → main TTS
- `https://<workspace>--kavra-f5tts-health.modal.run` → health check

## .env'e ekle

```bash
MODAL_F5TTS_URL=https://<workspace>--kavra-f5tts-synthesize.modal.run
# Opsiyonel:
MODAL_API_TOKEN=<internal-shared-secret>
```

`worker-voice` bu URL'e POST atıyor, kullanıcının referans sesini kullanarak yeni metin sentezliyor.

## Maliyet

- **A10G**: ~$1.10/saat (Modal pricing)
- **Cold start**: ~30-45sn (model yüklenmesi)
- **Warm inference**: ~3-5sn (1000 karakter için)
- **Container idle timeout**: 2dk — bu sürede yeni istek gelirse warm kalır

Tahmini: aktif Pro kullanıcı başına ayda ~$0.50-1.00 (10-30 sentez varsayımı).

## Model

[F5-TTS](https://github.com/SWivid/F5-TTS) — açık kaynak, 5sn referansla zero-shot cloning yapan
Türkçe/İngilizce/diğer dilleri destekleyen TTS modeli. Apache 2.0 license.

## Test

```bash
# Local test
modal run modal_f5tts.py::synthesize --payload \
  '{"reference_audio_url":"https://example.com/ref.wav","reference_text":"Merhaba","target_text":"Bu bir test"}'

# Production health
curl https://<your-workspace>--kavra-f5tts-health.modal.run
```

## Sorun Giderme

- **Out of memory**: A10G yerine A100 dene, ya da target_text uzunluğunu kıs.
- **Cold start çok uzun**: `keep_warm=1` parametresi ile bir worker'ı sürekli ayakta tut (maliyet artar).
- **Reference indirilemedi**: Supabase signed URL süresini 10dk yap (default 1 saat dahi olabilir).
