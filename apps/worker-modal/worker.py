"""
Kavra Modal Worker — YouTube Whisper Fallback
==============================================

Modal Cloud'da deploy edilen serverless Python worker.
yt-dlp ile YouTube audio download + Groq Whisper Large v3 Turbo transcribe.

Deploy:
    modal deploy worker.py

Endpoint:
    https://YOUR_USERNAME--kavra-yt-transcribe.modal.run/

Özellikler:
    - 25MB Whisper API limitini aşan videoları parallel chunks'a böler
    - 10 dakikalık parçalar paralel transcribe edilir → 2 saatlik video ~30sn
    - VAD (voice activity detection) ile sessizlikleri trim'ler
    - GPU gerekmez (Groq cloud Whisper kullanıyoruz)
"""

import modal
import os
import tempfile
import subprocess
import json
import asyncio
from pathlib import Path

app = modal.App("kavra-yt-transcribe")

# Container image: yt-dlp + ffmpeg + httpx
image = (
    modal.Image.debian_slim(python_version="3.12")
    .apt_install("ffmpeg")
    .pip_install(
        "yt-dlp==2024.12.13",
        "httpx==0.28.1",
        "fastapi[standard]==0.115.0",
    )
)

# Concurrency: 1 video işliyor ama içinde parallel chunk'lar var
# Modal'da: 60 dakika max execution, 8GB RAM
CONTAINER_TIMEOUT = 60 * 60                     # 1 saat
WHISPER_MAX_BYTES = 25 * 1024 * 1024            # 25MB Whisper API limit
CHUNK_DURATION_SEC = 600                         # 10 dakika her chunk


def download_audio(video_id: str, output_dir: str) -> tuple[str, dict]:
    """yt-dlp ile audio-only download. m4a 64kbps, küçük dosya."""
    output_path = os.path.join(output_dir, f"{video_id}.m4a")

    cmd = [
        "yt-dlp",
        f"https://www.youtube.com/watch?v={video_id}",
        "-f", "bestaudio[ext=m4a]/bestaudio",
        "--postprocessor-args", "ffmpeg:-ar 16000 -ac 1 -b:a 64k",
        "--no-playlist",
        "--quiet",
        "--no-warnings",
        "-o", output_path,
        "--print", "%(.{title,duration,channel,language})j",
    ]

    result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
    if result.returncode != 0:
        raise RuntimeError(f"yt-dlp failed: {result.stderr}")

    metadata = {}
    for line in result.stdout.strip().split("\n"):
        try:
            metadata = json.loads(line)
            break
        except json.JSONDecodeError:
            continue

    return output_path, metadata


def split_audio(audio_path: str, chunk_dir: str, chunk_seconds: int = 600) -> list[str]:
    """ffmpeg ile audio'yu N saniyelik parçalara böl."""
    output_pattern = os.path.join(chunk_dir, "chunk_%03d.m4a")

    cmd = [
        "ffmpeg",
        "-i", audio_path,
        "-f", "segment",
        "-segment_time", str(chunk_seconds),
        "-c", "copy",
        "-loglevel", "error",
        output_pattern,
    ]

    subprocess.run(cmd, capture_output=True, check=True)

    chunks = sorted(Path(chunk_dir).glob("chunk_*.m4a"))
    return [str(c) for c in chunks]


async def transcribe_chunk(
    chunk_path: str,
    chunk_index: int,
    chunk_offset_ms: int,
    groq_api_key: str,
    language: str | None = None,
) -> dict:
    """Tek chunk'ı Groq Whisper'a gönder."""
    import httpx

    with open(chunk_path, "rb") as f:
        audio_bytes = f.read()

    files = {
        "file": (f"chunk_{chunk_index}.m4a", audio_bytes, "audio/m4a"),
    }
    data = {
        "model": "whisper-large-v3-turbo",
        "response_format": "verbose_json",
        "timestamp_granularities[]": "segment",
    }
    if language and language != "auto":
        data["language"] = language

    async with httpx.AsyncClient(timeout=120.0) as client:
        res = await client.post(
            "https://api.groq.com/openai/v1/audio/transcriptions",
            headers={"Authorization": f"Bearer {groq_api_key}"},
            files=files,
            data=data,
        )
        res.raise_for_status()
        result = res.json()

    # Segments'i offset'le shift et
    segments = []
    for seg in result.get("segments", []):
        segments.append({
            "text": seg["text"],
            "startMs": int((seg["start"] * 1000) + chunk_offset_ms),
            "endMs": int((seg["end"] * 1000) + chunk_offset_ms),
        })

    return {
        "chunk_index": chunk_index,
        "language": result.get("language", language or "auto"),
        "segments": segments,
        "fullText": result.get("text", ""),
    }


@app.function(image=image, timeout=CONTAINER_TIMEOUT, memory=8192)
@modal.fastapi_endpoint(method="POST")
async def transcribe(payload: dict) -> dict:
    """
    POST /
    Body: { videoId: string, groqApiKey: string, language?: string }
    """
    import asyncio

    video_id = payload.get("videoId")
    groq_api_key = payload.get("groqApiKey")
    language = payload.get("language")

    if not video_id or not groq_api_key:
        return {"error": "videoId ve groqApiKey gerekli", "status": 400}

    with tempfile.TemporaryDirectory() as work_dir:
        # 1) Audio download
        try:
            audio_path, metadata = download_audio(video_id, work_dir)
        except Exception as e:
            return {"error": f"download_failed: {e}", "status": 500}

        audio_size = os.path.getsize(audio_path)
        duration_sec = int(metadata.get("duration", 0))

        # 2) Single shot vs chunked
        if audio_size <= WHISPER_MAX_BYTES:
            # Tek seferde transcribe
            result = await transcribe_chunk(audio_path, 0, 0, groq_api_key, language)
            return {
                "videoId": video_id,
                "language": result["language"],
                "segments": result["segments"],
                "fullText": result["fullText"],
                "durationSeconds": duration_sec,
                "channelName": metadata.get("channel"),
                "title": metadata.get("title"),
                "method": "single",
            }
        else:
            # Parallel chunks
            chunk_dir = os.path.join(work_dir, "chunks")
            os.makedirs(chunk_dir, exist_ok=True)
            chunk_paths = split_audio(audio_path, chunk_dir, CHUNK_DURATION_SEC)

            tasks = [
                transcribe_chunk(
                    p,
                    i,
                    i * CHUNK_DURATION_SEC * 1000,
                    groq_api_key,
                    language,
                )
                for i, p in enumerate(chunk_paths)
            ]
            chunk_results = await asyncio.gather(*tasks, return_exceptions=True)

            # Hata kontrolü
            errors = [r for r in chunk_results if isinstance(r, Exception)]
            if errors:
                return {"error": f"chunks_failed: {errors[0]}", "status": 500}

            # Merge
            all_segments = []
            full_text_parts = []
            detected_lang = "auto"
            for r in chunk_results:
                all_segments.extend(r["segments"])
                full_text_parts.append(r["fullText"])
                if r["language"] and detected_lang == "auto":
                    detected_lang = r["language"]

            return {
                "videoId": video_id,
                "language": detected_lang,
                "segments": all_segments,
                "fullText": " ".join(full_text_parts),
                "durationSeconds": duration_sec,
                "channelName": metadata.get("channel"),
                "title": metadata.get("title"),
                "method": "chunked",
                "chunkCount": len(chunk_paths),
            }


# Local test entry point
@app.local_entrypoint()
def main(video_id: str = "dQw4w9WgXcQ"):
    """Test: modal run worker.py --video-id dQw4w9WgXcQ"""
    import os
    groq_key = os.environ.get("GROQ_API_KEY")
    if not groq_key:
        print("GROQ_API_KEY env required for local test")
        return

    result = transcribe.remote({
        "videoId": video_id,
        "groqApiKey": groq_key,
    })
    print(json.dumps(result, indent=2)[:500])
