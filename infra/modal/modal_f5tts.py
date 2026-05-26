"""
Modal F5-TTS Voice Cloning Deployment
======================================

Kavra için voice cloning serverless GPU servisi.
F5-TTS modelini A10G GPU'da çalıştırıyor; cold start ~30sn, warm ~3-5sn.

Kurulum:
  pip install modal
  modal setup
  modal deploy modal_f5tts.py

Environment:
  MODAL_F5TTS_URL — deploy sonrası dönen URL
  MODAL_API_TOKEN — Modal token (opsiyonel, internal güvenlik için)

İstek formatı (POST JSON):
  {
    "reference_audio_url": "https://...wav",
    "reference_text": "Kullanıcının referans sesinde söylediği metin",
    "target_text": "Klonlanmış sesle söylenecek yeni metin",
    "language": "tr",
    "speed": 1.0
  }

Yanıt: audio/wav (raw bytes)
"""

import io
import os
import requests
from pathlib import Path

import modal

# Modal app
app = modal.App("kavra-f5tts")

# Image: F5-TTS + bağımlılıkları + model preload
image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("git", "ffmpeg", "libsndfile1")
    .pip_install(
        "torch==2.4.0",
        "torchaudio==2.4.0",
        "f5-tts==0.6.2",
        "soundfile",
        "numpy",
        "pydub",
        "requests",
    )
    # F5-TTS pretrained ağırlıklarını cache'e indirelim
    .run_commands(
        "python -c \"from huggingface_hub import snapshot_download; snapshot_download('SWivid/F5-TTS')\""
    )
)

# 1 saat timeout, A10G GPU (yeterli ve uygun fiyatlı)
@app.function(
    image=image,
    gpu="A10G",
    timeout=300,
    container_idle_timeout=120,  # 2 dk boşta tut, sonra terminate
    secrets=[modal.Secret.from_name("kavra-secrets", required_keys=[])],
)
@modal.fastapi_endpoint(method="POST", custom_domains=None)
def synthesize(payload: dict):
    """
    F5-TTS ile voice cloning.
    Cold start: ~30-45sn (model load)
    Warm: ~3-5sn (target_text uzunluğuna göre)
    """
    from fastapi import HTTPException, Response
    from f5_tts.api import F5TTS

    reference_url = payload.get("reference_audio_url")
    reference_text = payload.get("reference_text")
    target_text = payload.get("target_text")
    language = payload.get("language", "tr")
    speed = float(payload.get("speed", 1.0))

    if not all([reference_url, reference_text, target_text]):
        raise HTTPException(400, "reference_audio_url, reference_text, target_text gerekli")

    if len(target_text) > 2000:
        raise HTTPException(400, "target_text 2000 karakteri aşamaz")

    # Reference ses indir
    try:
        resp = requests.get(reference_url, timeout=30)
        resp.raise_for_status()
        ref_audio_bytes = resp.content
    except Exception as e:
        raise HTTPException(400, f"Reference audio indirilemedi: {e}")

    # Geçici dosyaya yaz
    ref_path = Path("/tmp/ref.wav")
    ref_path.write_bytes(ref_audio_bytes)

    # F5-TTS load (cache'li, ilk seferde yavaş)
    f5tts = F5TTS()

    try:
        # Synthesize
        wav, sr, _ = f5tts.infer(
            ref_file=str(ref_path),
            ref_text=reference_text,
            gen_text=target_text,
            speed=speed,
            cross_fade_duration=0.15,
        )

        # WAV bytes
        import soundfile as sf
        buf = io.BytesIO()
        sf.write(buf, wav, sr, format="WAV")
        audio_bytes = buf.getvalue()

        return Response(
            content=audio_bytes,
            media_type="audio/wav",
            headers={
                "X-Audio-Sample-Rate": str(sr),
                "X-Audio-Duration-Ms": str(int(len(wav) / sr * 1000)),
                "X-Inference-Backend": "f5-tts-modal",
            },
        )
    except Exception as e:
        raise HTTPException(500, f"F5-TTS synthesis hatası: {e}")
    finally:
        # Temizlik
        ref_path.unlink(missing_ok=True)


# Health check endpoint (warm-up için)
@app.function(image=image, gpu="A10G")
@modal.fastapi_endpoint(method="GET")
def health():
    return {"status": "ok", "backend": "f5-tts-modal", "version": "0.6.2"}


# Local test:
#   modal run modal_f5tts.py::synthesize --payload '{"reference_audio_url":"...", ...}'
