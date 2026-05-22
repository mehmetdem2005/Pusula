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

/** Metin → konuşma (Gemini TTS). Audio blob döner. */
export async function ttsSynthesize(text: string): Promise<Blob> {
  const token = await getToken();
  const res = await fetch(`${BASE}/v1/voice/tts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ text: text.slice(0, 2000) }),
  });
  if (!res.ok) throw new Error(`TTS ${res.status}`);
  return res.blob();
}

/** Oturum token'ı ile API çağrısı. Hata durumunda fırlatır. */
export async function authedFetch<T>(path: string, init?: RequestInit): Promise<T> {
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
    const text = await res.text().catch(() => '');
    throw new Error(`${res.status}: ${text.slice(0, 200)}`);
  }
  return (await res.json()) as T;
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
