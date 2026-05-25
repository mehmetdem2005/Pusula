'use client';

import { useEffect, useState } from 'react';
import { getSupabaseBrowser } from './supabase';

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';

async function getToken(): Promise<string | undefined> {
  const { data } = await getSupabaseBrowser().auth.getSession();
  return data.session?.access_token;
}

/** Konuşma → metin (Groq Whisper). Ham audio blob gönderir. */
export async function sttTranscribe(audio: Blob): Promise<string> {
  const token = await getToken();
  const res = await fetch(`${BASE}/v1/voice/stt?lang=tr`, {
    method: 'POST',
    headers: {
      'Content-Type': audio.type || 'audio/webm',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: audio,
  });
  if (!res.ok) throw new Error(`STT ${res.status}`);
  const data = (await res.json()) as { text: string };
  return data.text;
}

/** Metin → konuşma (Gemini TTS). `voice` = ses kimliği (örn 'Kore'). Audio blob döner. */
export async function ttsSynthesize(text: string, voice?: string): Promise<Blob> {
  const token = await getToken();
  const res = await fetch(`${BASE}/v1/voice/tts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ text: text.slice(0, 2000), ...(voice ? { voice } : {}) }),
  });
  if (!res.ok) throw new Error(`TTS ${res.status}`);
  return res.blob();
}

export interface VoiceOption {
  id: string;
  label: string;
  gender: string;
}

/** Kullanılabilir TTS seslerini çek (GET /v1/voice/voices). */
export async function fetchVoices(): Promise<VoiceOption[]> {
  const data = await authedFetch<{ voices: VoiceOption[] }>('/v1/voice/voices');
  return data?.voices ?? [];
}

/**
 * Streaming sohbet (SSE). `onDelta` her metin parçası için çağrılır. Stream bitince döner.
 * Sunucu `data: {"error": ...}` yazarsa fırlatır → çağıran non-streaming /chat'e düşebilir.
 */
export async function chatStream(body: unknown, onDelta: (delta: string) => void): Promise<void> {
  const token = await getToken();
  const res = await fetch(`${BASE}/v1/llm/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok || !res.body) throw new Error(`chat-stream ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const payload = trimmed.slice(5).trim();
      if (!payload) continue;
      let evt: { delta?: string; done?: boolean; error?: string };
      try {
        evt = JSON.parse(payload);
      } catch {
        continue; // SSE parça/parse hatası — atla
      }
      if (evt.error) throw new Error(evt.error);
      if (evt.delta) onDelta(evt.delta);
    }
  }
}

/**
 * Oturum token'ı ile API çağrısı. Render cold-start dayanıklılığı:
 *  - Ağ hatası (TypeError) VE 5xx (502/503/504 gateway/uyandırma) → bekle, tekrar dene.
 *  - 4xx (401/404...) → fırlat (retry yok).
 *  - Token her denemede taze alınır (cold-start penceresinde expire olabilir).
 *  - Boş/204/non-JSON gövde için güvenli parse.
 */
export async function authedFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 5; attempt++) {
    const wait = () => new Promise((r) => setTimeout(r, 2500 * (attempt + 1)));
    try {
      const token = await getToken();
      const res = await fetch(`${BASE}${path}`, {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(init?.headers ?? {}),
        },
      });
      if (!res.ok) {
        if (res.status >= 500 && attempt < 4) {
          await wait();
          continue;
        }
        const text = await res.text().catch(() => '');
        throw new Error(`${res.status}: ${text.slice(0, 200)}`);
      }
      const ct = res.headers.get('content-type') ?? '';
      if (res.status === 204 || !ct.includes('application/json')) {
        return undefined as T;
      }
      const body = await res.text();
      return (body ? JSON.parse(body) : undefined) as T;
    } catch (e) {
      lastErr = e;
      if (e instanceof TypeError && attempt < 4) {
        await wait();
        continue;
      }
      throw e;
    }
  }
  throw lastErr;
}

interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/** Basit GET veri çekme hook'u (loading/error durumlu). */
export function useApi<T>(path: string | null): ApiState<T> {
  const [state, setState] = useState<ApiState<T>>({ data: null, loading: !!path, error: null });

  useEffect(() => {
    if (!path) return;
    let alive = true;
    setState({ data: null, loading: true, error: null });
    authedFetch<T>(path)
      .then((d) => alive && setState({ data: d, loading: false, error: null }))
      .catch((e) => alive && setState({ data: null, loading: false, error: (e as Error).message }));
    return () => {
      alive = false;
    };
  }, [path]);

  return state;
}
