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
  getSpeechRecognition,
  segmentSentences,
  splitForSpeech,
  type SRInstance,
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
  'İlanlarımı karşılaştır',
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
  const recognitionRef = useRef<SRInstance | null>(null);

  // TTS kuyruğu.
  const ttsQueueRef = useRef<string[]>([]);
  const ttsRunningRef = useRef(false);
  const ttsEpochRef = useRef(0);
  const voiceRef = useRef('');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Bağlam (kullanıcı ilanları) + modeller + sesler.
  useEffect(() => {
    let alive = true;
    authedFetch<unknown>('/v1/ilanlar')
      .then((ilanlar) => {
        if (!alive) return;
        contextRef.current = [
          "Sen Pusula'nın emlak danışmanısın. Sade, net Türkçe yardımcı ol; karşılaştır,",
          'en iyi/en riskli olanı bul, öneride bulun. Skoru DEĞİŞTİRME, yalnız yorumla.',
          '',
          `İLANLAR (JSON): ${JSON.stringify(ilanlar)}`,
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
      recognitionRef.current?.abort?.();
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

  // Canlı dikte → composer'a yazar (kullanıcı düzeltip gönderir).
  function toggleMic() {
    if (recording) {
      recognitionRef.current?.stop();
      return;
    }
    const SR = getSpeechRecognition();
    if (!SR) {
      setError('Tarayıcın canlı sesi desteklemiyor (Chrome/Edge öner).');
      return;
    }
    const rec = new SR();
    rec.lang = 'tr-TR';
    rec.interimResults = true;
    rec.continuous = true;
    rec.maxAlternatives = 1;
    let finalText = '';
    rec.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        const t = r?.[0]?.transcript ?? '';
        if (r?.isFinal) finalText += `${t} `;
        else interim += t;
      }
      setInput((finalText + interim).trimStart());
    };
    rec.onerror = (ev) => {
      if (ev?.error === 'not-allowed' || ev?.error === 'service-not-allowed') {
        setError('Mikrofona erişilemedi (izin gerekli).');
      }
    };
    rec.onend = () => {
      setRecording(false);
      recognitionRef.current = null;
    };
    recognitionRef.current = rec;
    rec.start();
    setRecording(true);
    setError(null);
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
    <main className="bg-paper text-ink flex h-[100dvh] flex-col">
      <header className="border-hairline flex items-center justify-between border-b px-4 py-3">
        <Link href="/dashboard" className="text-ink-3 hover:text-navy text-sm font-medium">
          ← Panel
        </Link>
        <span className="text-navy font-serif text-lg">AI Asistan</span>
        <div className="flex items-center gap-2">
          <Link href="/sesli" className="text-ink-3 hover:text-navy text-sm" title="Sesli mod">
            Sesli
          </Link>
          <button
            type="button"
            onClick={() => {
              stopSpeech();
              setMessages([]);
              setError(null);
            }}
            className="border-hairline-strong text-ink-2 hover:border-navy hover:text-navy rounded-full border px-3 py-1 text-xs font-medium"
          >
            Yeni sohbet
          </button>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-4 py-6">
          {empty ? (
            <div className="mt-[12vh] text-center">
              <div className="orb mx-auto !h-20 !w-20" aria-hidden />
              <h1 className="text-navy mt-6 font-serif text-3xl">Nasıl yardımcı olayım?</h1>
              <p className="text-muted mt-2 text-sm">
                İlanlarını biliyorum — karşılaştırma, pazarlık, risk. Yaz ya da konuş.
              </p>
              <div className="mx-auto mt-8 grid max-w-xl gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => void send(s)}
                    className="rounded-card border-hairline bg-surface text-ink-2 hover:shadow-card border px-4 py-3 text-left text-sm transition-shadow"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {messages.map((m, i) => {
                if (m.role === 'assistant' && m.content === '') return null;
                return (
                  <div
                    key={i}
                    className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
                  >
                    <div
                      className={`rounded-card-lg max-w-[85%] whitespace-pre-wrap px-4 py-3 text-[15px] leading-relaxed ${
                        m.role === 'user'
                          ? 'bg-navy text-cream'
                          : 'border-hairline bg-surface text-ink border'
                      }`}
                    >
                      {m.content}
                    </div>
                  </div>
                );
              })}
              {loading && (messages[messages.length - 1]?.content ?? '') === '' && (
                <div className="flex justify-start">
                  <div className="rounded-card-lg border-hairline bg-surface text-muted border px-4 py-3 text-sm">
                    Düşünüyor…
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="border-hairline bg-paper border-t">
        <div className="mx-auto w-full max-w-3xl px-4 py-3">
          {error && <p className="text-band-asiri mb-2 text-sm">{error}</p>}
          <div className="mb-2 flex items-center gap-2">
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              disabled={loading || recording}
              aria-label="AI modeli"
              className="border-hairline-strong bg-surface text-ink-2 focus:border-navy max-w-[11rem] rounded-full border px-2 py-1 text-xs focus:outline-none disabled:opacity-50"
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
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                voiceOut ? 'bg-navy text-cream' : 'bg-paper-2 text-ink-3'
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
                className="border-hairline-strong bg-surface text-ink-2 focus:border-navy max-w-[8rem] rounded-full border px-2 py-1 text-xs focus:outline-none"
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
            className="rounded-card-lg border-hairline-strong bg-surface flex items-end gap-2 border p-2"
          >
            <button
              type="button"
              onClick={toggleMic}
              aria-label={recording ? 'Kaydı durdur' : 'Sesli yaz'}
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg ${
                recording ? 'bg-band-asiri text-cream animate-pulse' : 'bg-paper-2 text-ink-2'
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
              className="text-ink max-h-[200px] flex-1 resize-none bg-transparent px-1 py-2 text-[15px] focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="btn btn-gold h-10 shrink-0 disabled:opacity-50"
            >
              Gönder
            </button>
          </form>
          <p className="text-muted mt-1.5 text-center text-[11px]">
            Pusula AI yanıtları bilgilendiricidir; skoru deterministik motor hesaplar.
          </p>
        </div>
      </div>
    </main>
  );
}
