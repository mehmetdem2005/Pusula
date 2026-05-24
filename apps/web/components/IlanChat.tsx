'use client';

import { useEffect, useRef, useState, type ReactElement } from 'react';
import { authedFetch, sttTranscribe, ttsSynthesize } from '../lib/api';

interface Msg {
  role: 'user' | 'assistant';
  content: string;
}

const DEFAULT_SUGGESTIONS = [
  'Bu skoru açıkla',
  'Pazarlık payı ne olur?',
  'Yatırım için uygun mu?',
  'Riskler neler?',
];

interface Props {
  /** LLM'e verilecek system context (ilan veya portföy verisi). */
  context: string;
  /** Boş durumda gösterilecek tanıtım metni. */
  intro?: string;
  /** Hazır öneri çipleri. */
  suggestions?: string[];
}

/**
 * AI sohbet paneli — yazılı + sesli mod. İlan detayında veya dashboard'da (portföy) kullanılır.
 * Platform AI (key girişsiz). `context` dinamik veriyi içerir; LLM yorumlar, skoru değiştirmez.
 * Sesli giriş: Groq Whisper (STT). Sesli yanıt: Gemini TTS.
 */
export function IlanChat({ context, intro, suggestions }: Props): ReactElement {
  const chips = suggestions ?? DEFAULT_SUGGESTIONS;
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [voiceOut, setVoiceOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const mrRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Unmount'ta mikrofon track'lerini ve sesi kapat (mic göstergesi açık kalmasın).
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      audioRef.current?.pause();
    };
  }, []);

  async function playTts(text: string) {
    try {
      const blob = await ttsSynthesize(text);
      audioRef.current?.pause();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => URL.revokeObjectURL(url); // blob URL sızıntısını önle
      audioRef.current = audio;
      await audio.play();
    } catch {
      // sesli yanıt başarısızsa sessizce geç
    }
  }

  async function send(text: string) {
    const q = text.trim();
    if (!q || loading) return;
    setError(null);
    const next: Msg[] = [...messages, { role: 'user', content: q }];
    setMessages(next);
    setInput('');
    setLoading(true);
    try {
      // Son 20 mesajla sınırla (backend messages.max(100) + token şişmesi).
      const history = next.slice(-20);
      const resp = await authedFetch<{ text: string }>('/v1/llm/chat', {
        method: 'POST',
        body: JSON.stringify({
          messages: [{ role: 'system', content: context }, ...history],
          options: { taskType: 'quick-chat' },
        }),
      });
      setMessages((m) => [...m, { role: 'assistant', content: resp.text }]);
      requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: 1e9 }));
      if (voiceOut) void playTts(resp.text);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      // Tarayıcı/mobil desteklediği ilk formatı seç (mobilde webm olmayabilir).
      const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
      const picked = candidates.find(
        (t) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t),
      );
      const mr = picked
        ? new MediaRecorder(stream, { mimeType: picked })
        : new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e: BlobEvent) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        // Gerçek kayıt formatını kullan → STT doğru Content-Type alır.
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || picked || 'audio/webm' });
        setRecording(false);
        setLoading(true);
        sttTranscribe(blob)
          .then((text) => {
            setLoading(false);
            if (text.trim()) void send(text);
          })
          .catch((err) => {
            setLoading(false);
            setError((err as Error).message);
          });
      };
      mrRef.current = mr;
      mr.start();
      setRecording(true);
      setError(null);
    } catch {
      setError('Mikrofona erişilemedi (izin gerekli).');
    }
  }

  function toggleRecord() {
    if (recording) mrRef.current?.stop();
    else void startRecording();
  }

  return (
    <div className="rounded-lg bg-white p-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">AI Danışman</h2>
        <button
          type="button"
          onClick={() => setVoiceOut((v) => !v)}
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            voiceOut ? 'bg-[#0F1F4B] text-white' : 'bg-slate-100 text-slate-600'
          }`}
          aria-pressed={voiceOut}
        >
          {voiceOut ? '🔊 Sesli yanıt açık' : '🔈 Sesli yanıt'}
        </button>
      </div>

      {messages.length === 0 && (
        <p className="mb-3 text-sm text-slate-500">
          {intro ??
            'Skorun her metriğini biliyorum — pazarlık, yatırım, riskler hakkında yazarak veya konuşarak sor.'}
        </p>
      )}

      <div ref={scrollRef} className="mb-3 max-h-80 space-y-3 overflow-y-auto">
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'text-right' : 'text-left'}>
            <span
              className={`inline-block max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
                m.role === 'user' ? 'bg-[#0F1F4B] text-white' : 'bg-slate-100 text-slate-800'
              }`}
            >
              {m.content}
            </span>
          </div>
        ))}
        {loading && <p className="text-sm text-slate-400">Düşünüyor…</p>}
      </div>

      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}

      <div className="mb-2 flex flex-wrap gap-2">
        {chips.map((s) => (
          <button
            key={s}
            type="button"
            disabled={loading || recording}
            onClick={() => void send(s)}
            className="rounded-full border border-slate-300 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            {s}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
        className="flex gap-2"
      >
        <button
          type="button"
          onClick={toggleRecord}
          disabled={loading && !recording}
          className={`rounded-md px-3 py-2 text-sm ${
            recording ? 'animate-pulse bg-red-600 text-white' : 'bg-slate-100 text-slate-700'
          }`}
          aria-label={recording ? 'Kaydı durdur' : 'Sesli sor'}
        >
          {recording ? '■' : '🎤'}
        </button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={recording ? 'Dinliyorum…' : 'Bir soru yazın…'}
          disabled={recording}
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F1F4B]"
        />
        <button
          type="submit"
          disabled={loading || recording || !input.trim()}
          className="rounded-md bg-[#D4A22E] px-4 py-2 text-sm font-semibold text-[#0F1F4B] disabled:opacity-60"
        >
          Gönder
        </button>
      </form>
    </div>
  );
}
