'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
import { authedFetch, chatStream, fetchVoices, ttsSynthesize } from '../../lib/api';
import {
  getSpeechRecognition,
  segmentSentences,
  splitForSpeech,
  type SRInstance,
} from '../../lib/voice';
import { VoiceLiveClient, voiceLiveSupported, type LiveState } from '../../lib/voice-live';

const LIVE_ENABLED = process.env.NEXT_PUBLIC_VOICE_LIVE_ENABLED === '1';

type Status = 'idle' | 'listening' | 'thinking' | 'speaking';
interface Msg {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

type ACtor = typeof AudioContext;
function getAudioContext(): ACtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { AudioContext?: ACtor; webkitAudioContext?: ACtor };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

function CascadedVoice(): ReactElement {
  const [status, setStatus] = useState<Status>('idle');
  const [level, setLevel] = useState(0);
  const [userText, setUserText] = useState('');
  const [replyText, setReplyText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const historyRef = useRef<Msg[]>([]);
  const recognitionRef = useRef<SRInstance | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const voiceRef = useRef('');

  // TTS kuyruğu (epoch korumalı; sıradakini çalarken sentezler).
  const ttsQueueRef = useRef<string[]>([]);
  const ttsRunningRef = useRef(false);
  const ttsEpochRef = useRef(0);
  const playerRef = useRef<HTMLAudioElement | null>(null);

  // Bağlam: kullanıcının ilanları + ses-dostu sistem promptu.
  useEffect(() => {
    let alive = true;
    (async () => {
      let saved: unknown = { items: [] };
      try {
        saved = await authedFetch<unknown>('/v1/lists/saved-context');
      } catch {
        saved = { items: [] };
      }
      const sys: Msg = {
        role: 'system',
        content: [
          "Sen Pusula'nın sesli emlak danışmanısın. Sesli yanıta uygun konuş: KISA, sohbet dilinde,",
          'madde işareti/markdown yok, en fazla 2-3 cümle. Aşağıdaki JSON kullanıcının tüm listelerine',
          've Favorilerim’e kaydettiği ilanlar (skor/etiket dahil); karşılaştır, kelepiri bul, öneride',
          'bulun. Skoru DEĞİŞTİRME, yalnız yorumla.',
          '',
          `KAYITLI İLANLAR (JSON): ${JSON.stringify(saved)}`,
        ].join('\n'),
      };
      if (!alive) return;
      historyRef.current = [sys];
      setReady(true);
    })();
    fetchVoices()
      .then((vs) => {
        if (alive && vs.length) voiceRef.current = vs[0]!.id;
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  const stopAnalyser = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current = null;
    void audioCtxRef.current?.close().catch(() => undefined);
    audioCtxRef.current = null;
    setLevel(0);
  }, []);

  const stopSpeech = useCallback(() => {
    ttsEpochRef.current++;
    ttsQueueRef.current = [];
    ttsRunningRef.current = false;
    playerRef.current?.pause();
    playerRef.current = null;
  }, []);

  // ── TTS kuyruğu ──
  const playBlob = useCallback((blob: Blob): Promise<void> => {
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
      playerRef.current = audio;
      void audio.play().catch(done);
    });
  }, []);

  const runQueue = useCallback(async () => {
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
      if (alive()) {
        ttsRunningRef.current = false;
        setStatus((s) => (s === 'speaking' ? 'idle' : s));
      }
    }
  }, [playBlob]);

  const enqueueSpeech = useCallback(
    (text: string) => {
      const t = text.trim();
      if (!t) return;
      ttsQueueRef.current.push(t);
      if (!ttsRunningRef.current) void runQueue();
    },
    [runQueue],
  );

  // ── LLM yanıtı ──
  const handleUtterance = useCallback(
    async (text: string) => {
      const q = text.trim();
      if (!q) {
        setStatus('idle');
        return;
      }
      setUserText(q);
      setReplyText('');
      setStatus('thinking');
      historyRef.current.push({ role: 'user', content: q });
      const msgs = historyRef.current.slice(-21); // system + son 20
      const body = { messages: msgs, options: { taskType: 'quick-chat' as const } };

      let acc = '';
      let spoken = 0;
      try {
        await chatStream(body, (delta) => {
          acc += delta;
          setReplyText(acc);
          setStatus('speaking');
          const { sentences, rest } = segmentSentences(acc.slice(spoken));
          if (sentences.length) {
            sentences.forEach(enqueueSpeech);
            spoken = acc.length - rest.length;
          }
        });
        const tail = acc.slice(spoken).trim();
        if (tail) enqueueSpeech(tail);
        if (!acc.trim()) throw new Error('empty');
        historyRef.current.push({ role: 'assistant', content: acc });
        if (!ttsRunningRef.current) setStatus('idle');
      } catch {
        // Fallback: non-streaming.
        try {
          const resp = await authedFetch<{ text: string }>('/v1/llm/chat', {
            method: 'POST',
            body: JSON.stringify(body),
          });
          acc = resp.text ?? '';
          setReplyText(acc);
          historyRef.current.push({ role: 'assistant', content: acc });
          if (acc.trim()) {
            setStatus('speaking');
            splitForSpeech(acc).forEach(enqueueSpeech);
          } else {
            setStatus('idle');
          }
        } catch (e) {
          setError((e as Error).message);
          setStatus('idle');
        }
      }
    },
    [enqueueSpeech],
  );

  // ── Dinleme (canlı dikte + mic seviyesi) ──
  const startListening = useCallback(async () => {
    setError(null);
    stopSpeech();
    setUserText('');
    setReplyText('');

    // Mic seviyesi → orb ölçeği (analiz için ayrı stream).
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      const AC = getAudioContext();
      if (AC) {
        const ctx = new AC();
        audioCtxRef.current = ctx;
        const src = ctx.createMediaStreamSource(stream);
        const an = ctx.createAnalyser();
        an.fftSize = 256;
        src.connect(an);
        const data = new Uint8Array(an.frequencyBinCount);
        const loop = () => {
          an.getByteTimeDomainData(data);
          let sum = 0;
          for (const sample of data) {
            const v = (sample - 128) / 128;
            sum += v * v;
          }
          const rms = Math.sqrt(sum / data.length);
          setLevel(Math.min(1, rms * 3));
          rafRef.current = requestAnimationFrame(loop);
        };
        loop();
      }
    } catch {
      setError('Mikrofona erişilemedi (izin gerekli).');
      return;
    }

    const SR = getSpeechRecognition();
    if (!SR) {
      setError('Tarayıcın canlı sesi desteklemiyor. Chrome/Edge öner.');
      stopAnalyser();
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
      setUserText((finalText + interim).trimStart());
    };
    rec.onerror = (ev) => {
      if (ev?.error === 'not-allowed' || ev?.error === 'service-not-allowed') {
        setError('Mikrofona erişilemedi (izin gerekli).');
      }
    };
    rec.onend = () => {
      recognitionRef.current = null;
      stopAnalyser();
      const t = finalText.trim();
      if (t) void handleUtterance(t);
      else setStatus('idle');
    };
    recognitionRef.current = rec;
    rec.start();
    setStatus('listening');
  }, [handleUtterance, stopAnalyser, stopSpeech]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const toggle = useCallback(() => {
    if (status === 'listening') stopListening();
    else if (status === 'speaking' || status === 'thinking') {
      stopSpeech();
      stopAnalyser();
      setStatus('idle');
    } else void startListening();
  }, [status, startListening, stopListening, stopSpeech, stopAnalyser]);

  // Space ile aç/kapat.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !(e.target as HTMLElement)?.closest('input,textarea')) {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggle]);

  // Unmount temizliği.
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort?.();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      micStreamRef.current?.getTracks().forEach((t) => t.stop());
      void audioCtxRef.current?.close().catch(() => undefined);
      ttsEpochRef.current++;
      playerRef.current?.pause();
    };
  }, []);

  const reactiveScale = status === 'listening' || status === 'speaking' ? 1 + level * 0.4 : 1;
  const statusLabel: Record<Status, string> = {
    idle: 'Dokun ve konuş',
    listening: 'Dinliyorum…',
    thinking: 'Düşünüyor…',
    speaking: 'Yanıtlıyor…',
  };

  return (
    <main className="bg-night font-body text-fg relative flex h-[100dvh] w-full flex-col items-center justify-between overflow-hidden px-6 py-7">
      <div className="flex w-full max-w-2xl items-center justify-between">
        <Link
          href="/asistan"
          aria-label="Geri"
          className="press text-fg flex h-9 w-9 items-center justify-center rounded-full bg-white/5"
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
        <span className="font-display text-fg text-base font-bold">Sesli mod</span>
        <Link
          href="/asistan"
          aria-label="Yazılı sohbet"
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
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" />
          </svg>
        </Link>
      </div>

      {/* Orb */}
      <div className="flex flex-1 flex-col items-center justify-center gap-10">
        <div
          className={`relative grid place-items-center ${status === 'listening' ? 'orb-listening' : ''}`}
        >
          <span className="orb-ring" />
          <span className="orb-ring" />
          <span className="orb-ring" />
          <div
            className={`orb ${
              status === 'idle'
                ? 'orb-idle'
                : status === 'thinking'
                  ? 'orb-thinking'
                  : status === 'speaking'
                    ? 'orb-speaking'
                    : ''
            }`}
            style={{ transform: `scale(${reactiveScale})` }}
          />
        </div>
        <div className="text-center">
          <div className="font-display text-fg text-xl font-bold">{statusLabel[status]}</div>
          {!ready && <div className="text-fg-faint mt-1 text-xs">Hazırlanıyor…</div>}
        </div>
      </div>

      {/* Transcript */}
      <div className="min-h-[5rem] w-full max-w-2xl space-y-2 text-center">
        {userText && <p className="text-fg-dim text-sm">“{userText}”</p>}
        {replyText && <p className="text-fg">{replyText}</p>}
        {error && <p className="text-danger text-sm">{error}</p>}
      </div>

      {/* Mic kontrol */}
      <div className="flex flex-col items-center gap-3 pb-2">
        <button
          type="button"
          onClick={toggle}
          aria-label={status === 'listening' ? 'Durdur' : 'Konuş'}
          className={`press brand-glow flex h-16 w-16 items-center justify-center rounded-full text-2xl text-white transition-colors ${
            status === 'listening' ? 'bg-danger animate-pulse' : 'bg-brand'
          }`}
        >
          {status === 'listening' ? '■' : '🎤'}
        </button>
        <span className="text-fg-faint text-xs">Boşluk tuşu ile aç/kapat</span>
      </div>
    </main>
  );
}

/** Realtime (Gemini Live) sesli mod — barge-in + streaming. Hata olursa cascaded'e düşer. */
function LiveVoice({ onFallback }: { onFallback: () => void }): ReactElement {
  const [state, setState] = useState<LiveState>('connecting');
  const [started, setStarted] = useState(false);
  const [muted, setMuted] = useState(false);
  const [userText, setUserText] = useState('');
  const [reply, setReply] = useState('');
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const clientRef = useRef<VoiceLiveClient | null>(null);
  const assistantSpoke = useRef(false);

  const start = useCallback(async () => {
    setError(null);
    const c = new VoiceLiveClient({
      onState: setState,
      onUserText: (t) => {
        if (assistantSpoke.current) {
          setReply('');
          setUserText('');
          assistantSpoke.current = false;
        }
        setUserText((p) => (p + t).slice(-240));
      },
      onAssistantText: (t) => {
        assistantSpoke.current = true;
        setReply((p) => (p + t).slice(-400));
      },
      onLevel: setLevel,
      onError: (m) => setError(m),
    });
    clientRef.current = c;
    try {
      await c.start();
      setStarted(true);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  function toggleMute(): void {
    const m = !muted;
    setMuted(m);
    clientRef.current?.setMuted(m);
  }

  useEffect(() => {
    return () => clientRef.current?.stop();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.code === 'Space' && !(e.target as HTMLElement)?.closest('input,textarea')) {
        e.preventDefault();
        if (!started) void start();
        else toggleMute();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, muted]);

  const orbStatus: Status =
    state === 'speaking'
      ? 'speaking'
      : state === 'thinking' || state === 'connecting'
        ? 'thinking'
        : state === 'listening'
          ? 'listening'
          : 'idle';
  const reactiveScale = state === 'listening' || state === 'speaking' ? 1 + level * 0.4 : 1;
  const label = !started
    ? 'Başlamak için dokun'
    : state === 'connecting'
      ? 'Bağlanıyor…'
      : state === 'speaking'
        ? 'Yanıtlıyor…'
        : state === 'thinking'
          ? 'Düşünüyor…'
          : state === 'error'
            ? 'Bağlantı sorunu'
            : muted
              ? 'Sessize alındı'
              : 'Dinliyorum — konuşabilirsin';

  return (
    <main className="bg-night font-body text-fg relative flex h-[100dvh] w-full flex-col items-center justify-between overflow-hidden px-6 py-7">
      <div className="flex w-full max-w-2xl items-center justify-between">
        <Link
          href="/asistan"
          aria-label="Geri"
          className="press text-fg flex h-9 w-9 items-center justify-center rounded-full bg-white/5"
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
        <span className="font-display text-fg text-base font-bold">Sesli mod</span>
        <Link
          href="/asistan"
          aria-label="Yazılı sohbet"
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
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" />
          </svg>
        </Link>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-10">
        <div
          className={`relative grid place-items-center ${orbStatus === 'listening' && !muted ? 'orb-listening' : ''}`}
        >
          <span className="orb-ring" />
          <span className="orb-ring" />
          <span className="orb-ring" />
          <div
            className={`orb ${
              orbStatus === 'idle'
                ? 'orb-idle'
                : orbStatus === 'thinking'
                  ? 'orb-thinking'
                  : orbStatus === 'speaking'
                    ? 'orb-speaking'
                    : ''
            }`}
            style={{ transform: `scale(${reactiveScale})` }}
          />
        </div>
        <div className="text-center">
          <div className="font-display text-fg text-xl font-bold">{label}</div>
          <div className="text-fg-faint mt-1 text-xs">Realtime · sözümü kesebilirsin</div>
        </div>
      </div>

      <div className="min-h-[5rem] w-full max-w-2xl space-y-2 text-center" aria-live="polite">
        {userText && <p className="text-fg-dim text-sm">“{userText}”</p>}
        {reply && <p className="text-fg">{reply}</p>}
        {error && (
          <div className="text-danger space-y-2 text-sm">
            <p>{error}</p>
            <button type="button" onClick={onFallback} className="text-brand underline">
              Klasik sesli moda geç
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-col items-center gap-3 pb-2">
        <button
          type="button"
          onClick={() => (!started ? void start() : toggleMute())}
          aria-label={!started ? 'Başlat' : muted ? 'Sesi aç' : 'Sessize al'}
          aria-pressed={started && !muted}
          className={`press brand-glow flex h-16 w-16 items-center justify-center rounded-full text-2xl text-white transition-colors ${
            !started ? 'bg-brand' : muted ? 'bg-panel-soft' : 'bg-brand'
          }`}
        >
          {!started ? '🎤' : muted ? '🔇' : '🎙️'}
        </button>
        <span className="text-fg-faint text-xs">Boşluk tuşu ile başlat / sustur</span>
      </div>
    </main>
  );
}

export default function SesliPage(): ReactElement {
  const [useLive, setUseLive] = useState(false);
  const [fellBack, setFellBack] = useState(false);
  useEffect(() => {
    setUseLive(LIVE_ENABLED && voiceLiveSupported());
  }, []);
  if (useLive && !fellBack) return <LiveVoice onFallback={() => setFellBack(true)} />;
  return <CascadedVoice />;
}
