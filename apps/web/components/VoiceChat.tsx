'use client';

import { useRef, useState, type ReactElement } from 'react';

interface VoiceChatProps {
  /** Backend API base URL */
  apiBase?: string;
  /** STT bittikten sonra çağrılır (text) */
  onTranscript: (text: string) => void;
  /** TTS için Bearer token (Supabase access token) */
  getToken: () => Promise<string | null>;
}

/**
 * 🎤 Sesli sohbet bileşeni — Groq Whisper (STT) + Gemini TTS.
 *
 * - Mikrofon → MediaRecorder → POST /v1/voice/stt → metin
 * - Metin → POST /v1/voice/tts → WAV → çal
 */
export function VoiceChat({
  apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001',
  onTranscript,
  getToken,
}: VoiceChatProps): ReactElement {
  const [state, setState] = useState<'idle' | 'recording' | 'transcribing' | 'speaking'>('idle');
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  async function startRecording() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      const rec = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        await transcribe(new Blob(audioChunksRef.current, { type: mimeType }));
      };
      rec.start();
      recorderRef.current = rec;
      setState('recording');
    } catch (e) {
      setError(`Mikrofon: ${(e as Error).message}`);
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
    recorderRef.current = null;
  }

  async function transcribe(blob: Blob) {
    setState('transcribing');
    try {
      const token = await getToken();
      const res = await fetch(`${apiBase}/v1/voice/stt?lang=tr`, {
        method: 'POST',
        headers: {
          'Content-Type': blob.type,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: blob,
      });
      if (!res.ok) throw new Error(`STT ${res.status}`);
      const data = (await res.json()) as { text: string };
      if (data.text) onTranscript(data.text);
      setState('idle');
    } catch (e) {
      setError(`STT: ${(e as Error).message}`);
      setState('idle');
    }
  }

  async function _speak(text: string, voice = 'Kore') {
    setState('speaking');
    try {
      const token = await getToken();
      const res = await fetch(`${apiBase}/v1/voice/tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ text, voice }),
      });
      if (!res.ok) throw new Error(`TTS ${res.status}`);
      const audioBlob = await res.blob();
      const url = URL.createObjectURL(audioBlob);
      const audio = new Audio(url);
      audio.onended = () => {
        URL.revokeObjectURL(url);
        setState('idle');
      };
      await audio.play();
    } catch (e) {
      setError(`TTS: ${(e as Error).message}`);
      setState('idle');
    }
  }

  const isRecording = state === 'recording';

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={isRecording ? stopRecording : startRecording}
        disabled={state === 'transcribing' || state === 'speaking'}
        className={
          isRecording
            ? 'animate-pulse rounded-full bg-red-500 px-3 py-1.5 text-sm font-semibold text-white'
            : 'rounded-full bg-[#0F1F4B] px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50'
        }
        aria-label={isRecording ? 'Kaydı durdur' : 'Sesli yaz'}
      >
        {isRecording
          ? '⏹ Durdur'
          : state === 'transcribing'
            ? '⏳ Yazılıyor...'
            : state === 'speaking'
              ? '🔊 Konuşuyor...'
              : '🎤 Sesli'}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
