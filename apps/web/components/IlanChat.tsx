'use client';

import { useEffect, useRef, useState, type ReactElement } from 'react';
import {
  authedFetch,
  chatStream,
  fetchVoices,
  sttTranscribe,
  ttsSynthesize,
  type VoiceOption,
} from '../lib/api';

interface Msg {
  role: 'user' | 'assistant';
  content: string;
}

// Web Speech API (canlı dikte) — tarayıcıda yerleşik, ücretsiz, interim (canlı) sonuç verir.
interface SRAlternative {
  transcript: string;
}
interface SRResult {
  isFinal: boolean;
  0: SRAlternative;
}
interface SREvent {
  resultIndex: number;
  results: { length: number; [i: number]: SRResult };
}
interface SRInstance {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((e: SREvent) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort?: () => void;
}
type SRCtor = new () => SRInstance;

function getSpeechRecognition(): SRCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SRCtor;
    webkitSpeechRecognition?: SRCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const DEFAULT_SUGGESTIONS = [
  'Bu skoru açıkla',
  'Pazarlık payı ne olur?',
  'Yatırım için uygun mu?',
  'Riskler neler?',
];

interface ModelOpt {
  provider: string;
  model: string;
}

/** Model listesi (GET /v1/llm/models) çekilemezse yedek. "Otomatik" her zaman var. */
const FALLBACK_MODELS: ModelOpt[] = [
  { provider: 'groq', model: 'llama-3.3-70b-versatile' },
  { provider: 'gemini', model: 'gemini-2.5-flash' },
  { provider: 'deepseek', model: 'deepseek-v4-flash' },
];

const PROVIDER_LABEL: Record<string, string> = {
  groq: 'Groq',
  gemini: 'Gemini',
  deepseek: 'DeepSeek',
  anthropic: 'Claude',
};

const VOICE_STORAGE_KEY = 'pusula_tts_voice';
const SENTENCE_TERMINATORS = '.!?…\n';

/**
 * Akan metni tamamlanmış cümlelere böler. Sınır = sonlandırıcı (.!?…\n) + ardından boşluk/satır.
 * Sayı/kısaltma içi noktayı (örn "3.5", "vb.") erken kesmemek için sona düşen sonlandırıcı
 * (devamı henüz gelmemiş) `rest` olarak bekletilir; çağıran stream bitince `rest`i seslendirir.
 */
function segmentSentences(text: string): { sentences: string[]; rest: string } {
  const sentences: string[] = [];
  let last = 0;
  for (let i = 0; i < text.length; i++) {
    if (!SENTENCE_TERMINATORS.includes(text[i]!)) continue;
    let j = i;
    while (j + 1 < text.length && SENTENCE_TERMINATORS.includes(text[j + 1]!)) j++;
    const next = text[j + 1];
    if (next === ' ' || next === '\n' || next === '\t') {
      const s = text.slice(last, j + 1).trim();
      if (s) sentences.push(s);
      last = j + 1;
    }
    i = j;
  }
  return { sentences, rest: text.slice(last) };
}

/** Tam metni (fallback yolu) seslendirme parçalarına böler — kuyruk akıcı olsun diye. */
function splitForSpeech(text: string): string[] {
  const { sentences, rest } = segmentSentences(text);
  const tail = rest.trim();
  if (tail) sentences.push(tail);
  return sentences;
}

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
 *
 * Düşük gecikme: yanıt SSE ile akar (chatStream); sesli modda cümle tamamlandıkça TTS kuyruğa
 * alınır ve sıradaki cümle, mevcut cümle çalarken sentezlenir. Stream başarısız olursa
 * non-streaming /chat'e (failover'lı) düşülür.
 */
export function IlanChat({ context, intro, suggestions }: Props): ReactElement {
  const chips = suggestions ?? DEFAULT_SUGGESTIONS;
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [voiceOut, setVoiceOut] = useState(false);
  const [models, setModels] = useState<ModelOpt[]>([]);
  // '' = Otomatik (akıllı yönlendirme + failover); aksi halde 'provider:::model'.
  const [selectedModel, setSelectedModel] = useState('');
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [selectedVoice, setSelectedVoice] = useState('');
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const mrRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<SRInstance | null>(null);
  // TTS kuyruğu — voiceRef güncel sesi stale closure olmadan okur.
  const speechQueueRef = useRef<string[]>([]);
  const speechRunningRef = useRef(false);
  // Her stopSpeech epoch'u artırır; çalışan döngü kendi epoch'u eskidiyse durur (çift ses/yarış önlenir).
  const speechEpochRef = useRef(0);
  const voiceRef = useRef('');

  // Unmount'ta mikrofon track'lerini, sesi ve kuyruğu kapat.
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      speechQueueRef.current = [];
      speechRunningRef.current = false;
      audioRef.current?.pause();
      recognitionRef.current?.abort?.();
    };
  }, []);

  // Key'lerin desteklediği chat modellerini çek (seçici için). Hata olursa yedek listeye düş.
  useEffect(() => {
    let alive = true;
    authedFetch<{ models: ModelOpt[] }>('/v1/llm/models')
      .then((r) => {
        if (alive) setModels(r.models?.length ? r.models : FALLBACK_MODELS);
      })
      .catch(() => {
        if (alive) setModels(FALLBACK_MODELS);
      });
    return () => {
      alive = false;
    };
  }, []);

  // Kullanılabilir TTS seslerini çek + son seçimi localStorage'tan geri yükle.
  useEffect(() => {
    let alive = true;
    fetchVoices()
      .then((vs) => {
        if (!alive || vs.length === 0) return;
        setVoices(vs);
        let saved: string | null = null;
        try {
          saved = localStorage.getItem(VOICE_STORAGE_KEY);
        } catch {
          saved = null;
        }
        const initial = saved && vs.some((v) => v.id === saved) ? saved : vs[0]!.id;
        setSelectedVoice(initial);
        voiceRef.current = initial;
      })
      .catch(() => {
        /* ses listesi alınamazsa varsayılan ('Kore') kullanılır */
      });
    return () => {
      alive = false;
    };
  }, []);

  function stopSpeech() {
    speechEpochRef.current++;
    speechQueueRef.current = [];
    speechRunningRef.current = false;
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
      audio.onpause = done; // stopSpeech'te pause → kuyruk döngüsü çözülsün
      audioRef.current = audio;
      void audio.play().catch(done);
    });
  }

  function enqueueSpeech(text: string) {
    const t = text.trim();
    if (!t) return;
    speechQueueRef.current.push(t);
    if (!speechRunningRef.current) void runSpeechQueue();
  }

  // Kuyruğu sırayla çalar; sıradakini mevcut cümle çalarken sentezler (sentez↔çalma örtüşür).
  async function runSpeechQueue() {
    const myEpoch = speechEpochRef.current;
    const alive = () => myEpoch === speechEpochRef.current;
    speechRunningRef.current = true;
    const synth = (t: string) => ttsSynthesize(t, voiceRef.current || undefined).catch(() => null);
    let pending: Promise<Blob | null> | null = null;
    try {
      while (alive() && (speechQueueRef.current.length > 0 || pending)) {
        let blob: Blob | null;
        if (pending) {
          blob = await pending;
          pending = null;
        } else {
          blob = await synth(speechQueueRef.current.shift()!);
        }
        if (alive() && speechQueueRef.current.length > 0) {
          pending = synth(speechQueueRef.current.shift()!);
        }
        if (!alive()) break;
        if (blob) await playBlob(blob);
      }
    } finally {
      if (alive()) speechRunningRef.current = false;
    }
  }

  function setAssistantTail(content: string) {
    setMessages((m) => {
      const copy = [...m];
      copy[copy.length - 1] = { role: 'assistant', content };
      return copy;
    });
  }

  async function send(text: string) {
    const q = text.trim();
    if (!q || loading) return;
    setError(null);
    stopSpeech();
    const next: Msg[] = [...messages, { role: 'user', content: q }];
    setMessages(next);
    setInput('');
    setLoading(true);

    // Son 20 mesajla sınırla (backend messages.max(100) + token şişmesi).
    const history = next.slice(-20);
    // Model seçimi: belirli model seçilmişse provider+model gönder (failover bypass),
    // "Otomatik"te yalnız taskType (gateway akıllı yönlendirme + failover yapar).
    const [selProvider, selModel] = selectedModel ? selectedModel.split(':::') : [];
    const options =
      selProvider && selModel
        ? { taskType: 'quick-chat' as const, provider: selProvider, model: selModel }
        : { taskType: 'quick-chat' as const };
    const body = { messages: [{ role: 'system', content: context }, ...history], options };

    // Boş assistant balonu — token geldikçe doldurulur.
    setMessages((m) => [...m, { role: 'assistant', content: '' }]);

    let acc = '';
    let spoken = 0; // acc içinde seslendirilmiş mutlak indeks
    const speakStreaming = () => {
      if (!voiceOut) return;
      const { sentences, rest } = segmentSentences(acc.slice(spoken));
      if (sentences.length) {
        sentences.forEach(enqueueSpeech);
        spoken = acc.length - rest.length;
      }
    };
    const speakTail = () => {
      if (!voiceOut) return;
      const tail = acc.slice(spoken).trim();
      if (tail) {
        enqueueSpeech(tail);
        spoken = acc.length;
      }
    };

    try {
      await chatStream(body, (delta) => {
        acc += delta;
        setAssistantTail(acc);
        requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: 1e9 }));
        speakStreaming();
      });
      if (!acc.trim()) throw new Error('empty-stream');
      speakTail();
    } catch {
      if (acc.trim()) {
        // Kısmi yanıt geldi — koru ve kalanı seslendir (sessiz geç).
        speakTail();
      } else {
        // Streaming hiç üretmeden başarısız → non-streaming /chat (failover'lı) ile dene.
        try {
          const resp = await authedFetch<{ text: string }>('/v1/llm/chat', {
            method: 'POST',
            body: JSON.stringify(body),
          });
          acc = resp.text ?? '';
          setAssistantTail(acc);
          requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: 1e9 }));
          if (voiceOut && acc.trim()) splitForSpeech(acc).forEach(enqueueSpeech);
        } catch (e) {
          // Boş balonu kaldır + hatayı göster.
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
    }
  }

  // Canlı dikte (Web Speech API) varsa onu kullan — konuşurken kelimeler anında görünür;
  // yoksa MediaRecorder + Groq Whisper'a düş (kayıt → sunucu STT).
  function startRecording() {
    setError(null);
    const SR = getSpeechRecognition();
    if (SR) startLiveDictation(SR);
    else void startWhisperRecording();
  }

  function startLiveDictation(SR: SRCtor) {
    try {
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
        const t = finalText.trim();
        if (t) void send(t);
      };
      recognitionRef.current = rec;
      rec.start();
      setRecording(true);
    } catch {
      void startWhisperRecording();
    }
  }

  async function startWhisperRecording() {
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
    if (recording) {
      if (recognitionRef.current) recognitionRef.current.stop();
      else mrRef.current?.stop();
    } else startRecording();
  }

  function toggleVoiceOut() {
    setVoiceOut((v) => {
      if (v) stopSpeech(); // kapatırken çalan sesi durdur
      return !v;
    });
  }

  const lastIsStreaming = (messages[messages.length - 1]?.content ?? '') === '';

  return (
    <div className="border-line bg-panel rounded-2xl border p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-display text-fg text-base font-bold">AI Danışman</h2>
        <div className="flex items-center gap-2">
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            disabled={loading || recording}
            aria-label="AI modeli seç"
            className="border-line bg-panel-soft text-fg-dim focus:border-brand max-w-[10rem] rounded-full border px-2 py-1 text-xs focus:outline-none focus:ring-1 disabled:opacity-50"
          >
            <option value="">Otomatik</option>
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
          {voiceOut && voices.length > 0 && (
            <select
              value={selectedVoice}
              onChange={(e) => {
                const v = e.target.value;
                setSelectedVoice(v);
                voiceRef.current = v;
                try {
                  localStorage.setItem(VOICE_STORAGE_KEY, v);
                } catch {
                  /* localStorage yoksa yok say */
                }
              }}
              aria-label="Yanıt sesini seç"
              className="border-line bg-panel-soft text-fg-dim focus:border-brand max-w-[9rem] rounded-full border px-2 py-1 text-xs focus:outline-none focus:ring-1"
            >
              {voices.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={toggleVoiceOut}
            className={`press rounded-full px-3 py-1 text-xs font-medium ${
              voiceOut ? 'bg-brand text-white' : 'bg-panel-soft text-fg-dim'
            }`}
            aria-pressed={voiceOut}
          >
            {voiceOut ? '🔊 Sesli yanıt açık' : '🔈 Sesli yanıt'}
          </button>
        </div>
      </div>

      {messages.length === 0 && (
        <p className="text-fg-dim mb-3 text-sm">
          {intro ??
            'Skorun her metriğini biliyorum — pazarlık, yatırım, riskler hakkında yazarak veya konuşarak sor.'}
        </p>
      )}

      <div ref={scrollRef} className="mb-3 max-h-80 space-y-3 overflow-y-auto">
        {messages.map((m, i) => {
          if (m.role === 'assistant' && m.content === '') return null; // akış öncesi boş balon
          return (
            <div key={i} className={m.role === 'user' ? 'text-right' : 'text-left'}>
              <span
                className={`inline-block max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
                  m.role === 'user' ? 'bg-brand text-white' : 'bg-panel-soft text-fg'
                }`}
              >
                {m.content}
              </span>
            </div>
          );
        })}
        {loading && lastIsStreaming && <p className="text-fg-dim text-sm">Düşünüyor…</p>}
      </div>

      {error && <p className="text-danger mb-2 text-sm">{error}</p>}

      <div className="mb-2 flex flex-wrap gap-2">
        {chips.map((s) => (
          <button
            key={s}
            type="button"
            disabled={loading || recording}
            onClick={() => void send(s)}
            className="press border-line text-fg-dim rounded-full border px-3 py-1 text-xs transition-colors hover:bg-white/5 disabled:opacity-50"
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
          className={`press rounded-lg px-3 py-2 text-sm ${
            recording ? 'bg-danger animate-pulse text-white' : 'bg-panel-soft text-fg'
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
          aria-label="AI danışmana soru yaz"
          className="border-line bg-panel-soft text-fg placeholder:text-fg-faint focus:border-brand flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading || recording || !input.trim()}
          className="press bg-brand rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Gönder
        </button>
      </form>
    </div>
  );
}
