'use client';

// Paylaşılan ses yardımcıları — mikrofon yakalama (Groq Whisper STT) + cümle segmentasyonu (TTS için).
// NOT: Tarayıcı/Google konuşma tanıma (webkitSpeechRecognition) KULLANILMAZ; ses sunucuda
// Groq Whisper large-v3 ile yazıya dökülür (Türkçe %95+, Google değil).

import { sttTranscribe } from './api';

export interface MicCapture {
  /** Kaydı bitir → yazıya dök (sonuç onResult ile gelir). */
  stop: () => void;
  /** İptal et → yazıya dökme, temizle. */
  cancel: () => void;
}

export interface MicCaptureOptions {
  onResult: (text: string) => void;
  onError: (message: string) => void;
  /** Mic RMS seviyesi 0..1 (orb animasyonu için). */
  onLevel?: (level: number) => void;
  onPhase?: (phase: 'recording' | 'transcribing') => void;
  /** Konuşma başladıktan sonra bu kadar sessizlikte otomatik bitir (ms). 0 = kapalı. */
  silenceMs?: number;
  /** Sert üst sınır (ms). */
  maxMs?: number;
}

type ACtor = typeof AudioContext;
function getAudioContext(): ACtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { AudioContext?: ACtor; webkitAudioContext?: ACtor };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

/**
 * Mikrofonu aç, MediaRecorder ile kaydet; konuşma bitince (sessizlik VAD'i ya da elle stop)
 * Groq Whisper'a (sunucu STT) gönderip metni döndür.
 */
export async function startMicCapture(opts: MicCaptureOptions): Promise<MicCapture> {
  const silenceMs = opts.silenceMs ?? 1400;
  const maxMs = opts.maxMs ?? 20_000;

  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
    opts.onError('Mikrofona erişilemedi (izin gerekli).');
    throw new Error('mic-permission');
  }

  // Tarayıcı/mobil desteklediği ilk formatı seç (mobilde webm olmayabilir).
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
  const picked = candidates.find(
    (t) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t),
  );
  const mr = picked ? new MediaRecorder(stream, { mimeType: picked }) : new MediaRecorder(stream);
  const chunks: Blob[] = [];
  mr.ondataavailable = (e: BlobEvent) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  let raf = 0;
  let ctx: AudioContext | null = null;
  let stopped = false;
  let canceled = false;
  let speechSeen = false;
  let silenceStart = 0;
  const startedAt = Date.now();

  const finish = (): void => {
    if (stopped || canceled) return;
    stopped = true;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    try {
      mr.stop();
    } catch {
      /* zaten durmuş */
    }
  };

  const cleanup = (): void => {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    stream.getTracks().forEach((t) => t.stop());
    void ctx?.close().catch(() => undefined);
    ctx = null;
    opts.onLevel?.(0);
  };

  // Mic seviyesi (orb) + sessizlik tabanlı otomatik durdurma (VAD).
  const AC = getAudioContext();
  if (AC) {
    ctx = new AC();
    const src = ctx.createMediaStreamSource(stream);
    const an = ctx.createAnalyser();
    an.fftSize = 256;
    src.connect(an);
    const data = new Uint8Array(an.frequencyBinCount);
    const SPEECH_RMS = 0.04;
    const loop = (): void => {
      an.getByteTimeDomainData(data);
      let sum = 0;
      for (const sample of data) {
        const v = (sample - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / data.length);
      opts.onLevel?.(Math.min(1, rms * 3));
      const now = Date.now();
      if (rms > SPEECH_RMS) {
        speechSeen = true;
        silenceStart = 0;
      } else if (speechSeen && silenceMs > 0) {
        if (!silenceStart) silenceStart = now;
        else if (now - silenceStart > silenceMs) return finish();
      }
      if (now - startedAt > maxMs) return finish();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
  }

  mr.onstop = () => {
    cleanup();
    if (canceled) return;
    const blob = new Blob(chunks, { type: mr.mimeType || picked || 'audio/webm' });
    if (!blob.size) {
      opts.onResult('');
      return;
    }
    opts.onPhase?.('transcribing');
    sttTranscribe(blob)
      .then((text) => opts.onResult(text.trim()))
      .catch((e) => opts.onError((e as Error).message));
  };

  mr.start();
  opts.onPhase?.('recording');

  return {
    stop: finish,
    cancel: () => {
      canceled = true;
      try {
        mr.stop();
      } catch {
        /* zaten durmuş */
      }
      cleanup();
    },
  };
}

const SENTENCE_TERMINATORS = '.!?…\n';

/** Akan metni tamamlanmış cümlelere böler (sınır = sonlandırıcı + boşluk/satır). */
export function segmentSentences(text: string): { sentences: string[]; rest: string } {
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

/** Tam metni seslendirme parçalarına böler. */
export function splitForSpeech(text: string): string[] {
  const { sentences, rest } = segmentSentences(text);
  const tail = rest.trim();
  if (tail) sentences.push(tail);
  return sentences;
}

/**
 * İlk sesi erken başlatmak için yumuşak sınır (time-to-first-audio düşer):
 * min karakterden sonra ilk virgül/iki nokta/tire/satır; yoksa max'ta kelime sınırı.
 * Kesme indeksi (exclusive) döner, uygun yer yoksa -1.
 */
export function earlyBreak(text: string, min = 22, max = 90): number {
  for (let i = min; i < text.length; i++) {
    if (',;:—\n'.includes(text[i]!)) return i + 1;
  }
  if (text.length >= max) {
    const sp = text.lastIndexOf(' ', max);
    if (sp >= min) return sp + 1;
  }
  return -1;
}
