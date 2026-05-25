'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type ReactElement } from 'react';
import {
  authedFetch,
  chatStream,
  fetchVoices,
  ttsSynthesize,
  type VoiceOption,
} from '../../lib/api';
import {
  earlyBreak,
  segmentSentences,
  splitForSpeech,
  startMicCapture,
  type MicCapture,
} from '../../lib/voice';

interface Msg {
  role: 'user' | 'assistant';
  content: string;
}
interface ModelOpt {
  provider: string;
  model: string;
}

const FALLBACK_MODELS: ModelOpt[] = [
  { provider: 'groq', model: 'llama-3.3-70b-versatile' },
  { provider: 'gemini', model: 'gemini-2.5-flash' },
  { provider: 'deepseek', model: 'deepseek-chat' },
];
const PROVIDER_LABEL: Record<string, string> = {
  groq: 'Groq',
  gemini: 'Gemini',
  deepseek: 'DeepSeek',
  anthropic: 'Claude',
};
const SUGGESTIONS = [
  'Kayıtlı ilanlarımı karşılaştır',
  'En kelepir olanı hangisi?',
  'Pazarlık payı ne olur?',
  'Riskli olanları göster',
];

export default function AsistanPage(): ReactElement {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [voiceOut, setVoiceOut] = useState(false);
  const [models, setModels] = useState<ModelOpt[]>([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [selectedVoice, setSelectedVoice] = useState('');
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const contextRef = useRef('Sen Pusula’nın emlak danışmanısın. Sade, net Türkçe yardımcı ol.');
  const captureRef = useRef<MicCapture | null>(null);

  // TTS kuyruğu.
  const ttsQueueRef = useRef<string[]>([]);
  const ttsRunningRef = useRef(false);
  const ttsEpochRef = useRef(0);
  const voiceRef = useRef('');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Bağlam (tüm kayıtlı ilanlar + skor) + modeller + sesler.
  useEffect(() => {
    let alive = true;
    authedFetch<unknown>('/v1/lists/saved-context')
      .then((saved) => {
        if (!alive) return;
        contextRef.current = [
          "Sen Pusula'nın emlak danışmanısın. Sade, net Türkçe yardımcı ol; karşılaştır,",
          'en kelepir/en riskli olanı bul, kullanıcıya öneride bulun. Aşağıdaki JSON kullanıcının',
          'TÜM listelerine + Favorilerim’e kaydettiği ilanlar (skor/etiket + hangi listelerde).',
          'Skoru DEĞİŞTİRME, yalnız yorumla ve gerekçelendir.',
          '',
          `KAYITLI İLANLAR (JSON): ${JSON.stringify(saved)}`,
        ].join('\n');
      })
      .catch(() => undefined);
    authedFetch<{ models: ModelOpt[] }>('/v1/llm/models')
      .then((r) => alive && setModels(r.models?.length ? r.models : FALLBACK_MODELS))
      .catch(() => alive && setModels(FALLBACK_MODELS));
    fetchVoices()
      .then((vs) => {
        if (!alive || !vs.length) return;
        setVoices(vs);
        setSelectedVoice(vs[0]!.id);
        voiceRef.current = vs[0]!.id;
      })
      .catch(() => undefined);
    return () => {
      alive = false;
      captureRef.current?.cancel();
      ttsEpochRef.current++;
      audioRef.current?.pause();
    };
  }, []);

  function stopSpeech() {
    ttsEpochRef.current++;
    ttsQueueRef.current = [];
    ttsRunningRef.current = false;
    audioRef.current?.pause();
    audioRef.current = null;
  }
  function playBlob(blob: Blob): Promise<void> {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        URL.revokeObjectURL(url);
        resolve();
      };
      audio.onended = done;
      audio.onerror = done;
      audio.onpause = done;
      audioRef.current = audio;
      void audio.play().catch(done);
    });
  }
  async function runQueue() {
    const myEpoch = ttsEpochRef.current;
    const alive = () => myEpoch === ttsEpochRef.current;
    ttsRunningRef.current = true;
    const synth = (t: string) => ttsSynthesize(t, voiceRef.current || undefined).catch(() => null);
    let pending: Promise<Blob | null> | null = null;
    try {
      while (alive() && (ttsQueueRef.current.length > 0 || pending)) {
        let blob: Blob | null;
        if (pending) {
          blob = await pending;
          pending = null;
        } else {
          blob = await synth(ttsQueueRef.current.shift()!);
        }
        if (alive() && ttsQueueRef.current.length > 0)
          pending = synth(ttsQueueRef.current.shift()!);
        if (!alive()) break;
        if (blob) await playBlob(blob);
      }
    } finally {
      if (alive()) ttsRunningRef.current = false;
    }
  }
  function enqueueSpeech(text: string) {
    const t = text.trim();
    if (!t) return;
    ttsQueueRef.current.push(t);
    if (!ttsRunningRef.current) void runQueue();
  }

  function scrollToBottom() {
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: 1e9, behavior: 'smooth' }));
  }

  async function send(text: string) {
    const q = text.trim();
    if (!q || loading) return;
    setError(null);
    stopSpeech();
    const next: Msg[] = [...messages, { role: 'user', content: q }];
    setMessages(next);
    setInput('');
    if (taRef.current) taRef.current.style.height = 'auto';
    setLoading(true);
    scrollToBottom();

    const history = next.slice(-20);
    const [selProvider, selModel] = selectedModel ? selectedModel.split(':::') : [];
    const options =
      selProvider && selModel
        ? { taskType: 'quick-chat' as const, provider: selProvider, model: selModel }
        : { taskType: 'quick-chat' as const };
    const body = {
      messages: [{ role: 'system', content: contextRef.current }, ...history],
      options,
    };

    setMessages((m) => [...m, { role: 'assistant', content: '' }]);
    const setTail = (c: string) =>
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = { role: 'assistant', content: c };
        return copy;
      });

    let acc = '';
    let spoken = 0;
    const speak = (final: boolean) => {
      if (!voiceOut) return;
      if (final) {
        const tail = acc.slice(spoken).trim();
        if (tail) enqueueSpeech(tail);
        return;
      }
      if (spoken === 0) {
        const cut = earlyBreak(acc);
        if (cut > 0) {
          enqueueSpeech(acc.slice(0, cut));
          spoken = cut;
        }
      }
      const { sentences, rest } = segmentSentences(acc.slice(spoken));
      if (sentences.length) {
        sentences.forEach(enqueueSpeech);
        spoken = acc.length - rest.length;
      }
    };

    try {
      await chatStream(body, (delta) => {
        acc += delta;
        setTail(acc);
        scrollToBottom();
        speak(false);
      });
      if (!acc.trim()) throw new Error('empty');
      speak(true);
    } catch {
      if (acc.trim()) {
        speak(true);
      } else {
        try {
          const resp = await authedFetch<{ text: string }>('/v1/llm/chat', {
            method: 'POST',
            body: JSON.stringify(body),
          });
          acc = resp.text ?? '';
          setTail(acc);
          if (voiceOut && acc.trim()) splitForSpeech(acc).forEach(enqueueSpeech);
        } catch (e) {
          setMessages((m) =>
            m.filter(
              (mm, i) => !(i === m.length - 1 && mm.role === 'assistant' && mm.content === ''),
            ),
          );
          setError((e as Error).message);
        }
      }
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  }

  // Mic kaydı → Groq Whisper → composer'a yazar (kullanıcı düzeltip gönderir).
  function toggleMic() {
    if (recording) {
      captureRef.current?.stop();
      return;
    }
    setError(null);
    setRecording(true);
    void startMicCapture({
      onResult: (t) => {
        captureRef.current = null;
        setRecording(false);
        if (t) setInput((prev) => (prev ? `${prev} ${t}` : t));
      },
      onError: (m) => {
        captureRef.current = null;
        setRecording(false);
        setError(m);
      },
    })
      .then((c) => {
        captureRef.current = c;
      })
      .catch(() => setRecording(false));
  }

  function onTextareaInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }

  function toggleVoiceOut() {
    setVoiceOut((v) => {
      if (v) stopSpeech();
      return !v;
    });
  }

  const empty = messages.length === 0;

  return (
    <main className="bg-night font-body text-fg flex h-[100dvh] flex-col">
      <header className="glass border-line flex items-center justify-between border-b px-2 py-2.5">
        <Link
          href="/kesfet"
          aria-label="Geri"
          className="press text-fg flex h-9 w-9 items-center justify-center rounded-full"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
        <span className="font-display text-fg text-base font-bold">AI Asistan</span>
        <div className="flex items-center gap-1.5">
          <Link
            href="/sesli"
            aria-label="Sesli mod"
            className="press text-fg flex h-9 w-9 items-center justify-center rounded-full bg-white/5"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z" />
              <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
            </svg>
          </Link>
          <button
            type="button"
            onClick={() => {
              stopSpeech();
              setMessages([]);
              setError(null);
            }}
            aria-label="Yeni sohbet"
            className="press text-fg flex h-9 w-9 items-center justify-center rounded-full bg-white/5"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-2xl px-4 py-6">
          {empty ? (
            <div className="mt-[10vh] text-center">
              <div className="orb orb-idle mx-auto !h-20 !w-20" aria-hidden />
              <h1 className="font-display text-fg mt-6 text-2xl font-bold">
                Nasıl yardımcı olayım?
              </h1>
              <p className="text-fg-dim mt-2 text-sm">
                Tüm kaydettiğin ilanları biliyorum — karşılaştır, kelepir bul, riskleri gör.
              </p>
              <div className="mx-auto mt-8 grid max-w-xl gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => void send(s)}
                    className="press border-line bg-panel text-fg-dim hover:text-fg rounded-xl border px-4 py-3 text-left text-sm"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((m, i) => {
                if (m.role === 'assistant' && m.content === '') return null;
                return (
                  <div
                    key={i}
                    className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
                  >
                    <div
                      className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed ${
                        m.role === 'user'
                          ? 'bg-brand text-white'
                          : 'border-line bg-panel text-fg border'
                      }`}
                    >
                      {m.content}
                    </div>
                  </div>
                );
              })}
              {loading && (messages[messages.length - 1]?.content ?? '') === '' && (
                <div className="flex justify-start">
                  <div className="border-line bg-panel text-fg-dim flex items-center gap-1.5 rounded-2xl border px-4 py-3 text-sm">
                    <span className="bg-fg-faint h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:-0.3s]" />
                    <span className="bg-fg-faint h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:-0.15s]" />
                    <span className="bg-fg-faint h-1.5 w-1.5 animate-bounce rounded-full" />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div
        className="glass border-line border-t"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="mx-auto w-full max-w-2xl px-4 py-3">
          {error && <p className="text-danger mb-2 text-sm">{error}</p>}
          <div className="mb-2 flex items-center gap-2">
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              disabled={loading || recording}
              aria-label="AI modeli"
              className="border-line bg-panel text-fg-dim focus:border-brand max-w-[11rem] rounded-full border px-2.5 py-1 text-xs focus:outline-none disabled:opacity-50"
            >
              <option value="">Otomatik model</option>
              {Object.entries(
                models.reduce<Record<string, ModelOpt[]>>((acc, m) => {
                  (acc[m.provider] ??= []).push(m);
                  return acc;
                }, {}),
              ).map(([prov, list]) => (
                <optgroup key={prov} label={PROVIDER_LABEL[prov] ?? prov}>
                  {list.map((m) => (
                    <option key={`${prov}:::${m.model}`} value={`${prov}:::${m.model}`}>
                      {m.model}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <button
              type="button"
              onClick={toggleVoiceOut}
              aria-pressed={voiceOut}
              className={`press rounded-full px-3 py-1 text-xs font-medium ${
                voiceOut ? 'bg-brand text-white' : 'bg-panel text-fg-dim'
              }`}
            >
              {voiceOut ? '🔊 Sesli yanıt' : '🔈 Sesli yanıt'}
            </button>
            {voiceOut && voices.length > 0 && (
              <select
                value={selectedVoice}
                onChange={(e) => {
                  setSelectedVoice(e.target.value);
                  voiceRef.current = e.target.value;
                }}
                aria-label="Ses"
                className="border-line bg-panel text-fg-dim focus:border-brand max-w-[8rem] rounded-full border px-2.5 py-1 text-xs focus:outline-none"
              >
                {voices.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                  </option>
                ))}
              </select>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
            className="border-line bg-panel flex items-end gap-2 rounded-2xl border p-2"
          >
            <button
              type="button"
              onClick={toggleMic}
              aria-label={recording ? 'Kaydı durdur' : 'Sesli yaz'}
              className={`press flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg ${
                recording ? 'bg-danger animate-pulse text-white' : 'bg-panel-soft text-fg'
              }`}
            >
              {recording ? '■' : '🎤'}
            </button>
            <textarea
              ref={taRef}
              value={input}
              onChange={onTextareaInput}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void send(input);
                }
              }}
              rows={1}
              placeholder={recording ? 'Dinliyorum…' : 'Bir şey sor… (Enter ile gönder)'}
              className="text-fg placeholder:text-fg-faint max-h-[200px] flex-1 resize-none bg-transparent px-1 py-2 text-[15px] focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="press bg-brand flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white disabled:opacity-40"
              aria-label="Gönder"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z" />
              </svg>
            </button>
          </form>
          <p className="text-fg-faint mt-1.5 text-center text-[11px]">
            Pusula AI yanıtları bilgilendiricidir; skoru deterministik motor hesaplar.
          </p>
        </div>
      </div>
    </main>
  );
}
