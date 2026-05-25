'use client';

import { getSupabaseBrowser } from './supabase';

export type LiveState = 'connecting' | 'idle' | 'listening' | 'thinking' | 'speaking' | 'error';

export interface VoiceLiveHandlers {
  onState: (s: LiveState) => void;
  onUserText: (text: string) => void; // giriş transkripti (interim biriken)
  onAssistantText: (text: string) => void; // çıkış transkripti (interim biriken)
  onLevel: (level: number) => void; // mic RMS 0..1 (orb)
  onError: (msg: string) => void;
}

interface ServerMsg {
  t: string;
  d?: string;
  text?: string;
  m?: string;
}

type ACtor = typeof AudioContext;
function getAC(): ACtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { AudioContext?: ACtor; webkitAudioContext?: ACtor };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

/** Tarayıcı desteği (AudioWorklet + WebSocket + getUserMedia). */
export function voiceLiveSupported(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window as unknown as { WebSocket?: unknown };
  return (
    !!getAC() &&
    !!w.WebSocket &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof AudioWorkletNode !== 'undefined'
  );
}

function wsBase(): string {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
  if (base) return base.replace(/^http/i, 'ws');
  if (typeof window !== 'undefined') return window.location.origin.replace(/^http/i, 'ws');
  return '';
}

function b64ToInt16(b64: string): Int16Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Int16Array(bytes.buffer);
}

/**
 * Realtime sesli sohbet istemcisi (Gemini Live relay'ine bağlanır).
 * Capture (AudioWorklet 16k PCM16) → WS → relay; relay → 24k PCM playback (gapless) + barge-in.
 */
export class VoiceLiveClient {
  private ws: WebSocket | null = null;
  private captureCtx: AudioContext | null = null;
  private playCtx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private analyser: AnalyserNode | null = null;
  private raf: number | null = null;
  private sources: AudioBufferSourceNode[] = [];
  private nextStart = 0;
  private muted = false;
  private closed = false;
  private state: LiveState = 'connecting';

  constructor(private readonly h: VoiceLiveHandlers) {}

  private setState(s: LiveState): void {
    this.state = s;
    this.h.onState(s);
  }

  async start(): Promise<void> {
    this.setState('connecting');
    const AC = getAC();
    if (!AC) throw new Error('AudioContext yok');

    const { data } = await getSupabaseBrowser().auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error('Oturum yok');

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
      },
    });

    // Capture grafiği: mic → worklet → muted sink (process() çalışsın), mic → analyser (seviye).
    this.captureCtx = new AC();
    await this.captureCtx.audioWorklet.addModule('/voice-capture.worklet.js');
    const src = this.captureCtx.createMediaStreamSource(this.stream);
    this.workletNode = new AudioWorkletNode(this.captureCtx, 'voice-capture');
    const sink = this.captureCtx.createGain();
    sink.gain.value = 0;
    src.connect(this.workletNode);
    this.workletNode.connect(sink);
    sink.connect(this.captureCtx.destination);

    this.analyser = this.captureCtx.createAnalyser();
    this.analyser.fftSize = 256;
    src.connect(this.analyser);
    this.startLevelLoop();

    this.workletNode.port.onmessage = (e: MessageEvent): void => {
      if (this.muted || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;
      this.ws.send(e.data as ArrayBuffer);
    };

    // Playback context (24k buffer'lar burada zamanlanır).
    this.playCtx = new AC();

    // WS bağlan.
    const url = `${wsBase()}/v1/voice/live?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(url);
    this.ws = ws;
    ws.onmessage = (ev: MessageEvent): void => this.onServer(ev);
    ws.onerror = (): void => {
      this.h.onError('Bağlantı hatası');
      this.setState('error');
    };
    ws.onclose = (): void => {
      if (!this.closed) this.setState('error');
    };
  }

  private onServer(ev: MessageEvent): void {
    let msg: ServerMsg;
    try {
      msg = JSON.parse(typeof ev.data === 'string' ? ev.data : '') as ServerMsg;
    } catch {
      return;
    }
    switch (msg.t) {
      case 'ready':
        this.setState('listening');
        break;
      case 'audio':
        if (msg.d) this.enqueueAudio(msg.d);
        break;
      case 'in_tx':
        if (msg.text) this.h.onUserText(msg.text);
        break;
      case 'out_tx':
        if (msg.text) this.h.onAssistantText(msg.text);
        break;
      case 'interrupted':
        this.flushPlayback();
        this.setState('listening');
        break;
      case 'turn_end':
        if (this.sources.length === 0) this.setState('listening');
        break;
      case 'quota':
        this.h.onError('Günlük sesli sohbet süren doldu.');
        this.setState('error');
        break;
      case 'error':
        this.h.onError(msg.m ?? 'Hata');
        this.setState('error');
        break;
    }
  }

  private enqueueAudio(b64: string): void {
    const ctx = this.playCtx;
    if (!ctx) return;
    void ctx.resume();
    const i16 = b64ToInt16(b64);
    if (i16.length === 0) return;
    const f32 = new Float32Array(i16.length);
    for (let i = 0; i < i16.length; i++) f32[i] = i16[i]! / 32768;
    const buf = ctx.createBuffer(1, f32.length, 24000);
    buf.getChannelData(0).set(f32);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    const t = Math.max(ctx.currentTime + 0.05, this.nextStart);
    src.start(t);
    this.nextStart = t + buf.duration;
    this.sources.push(src);
    this.setState('speaking');
    src.onended = (): void => {
      this.sources = this.sources.filter((s) => s !== src);
      if (this.sources.length === 0 && this.state === 'speaking') this.setState('listening');
    };
  }

  private flushPlayback(): void {
    for (const s of this.sources) {
      try {
        s.stop();
      } catch {
        /* yok say */
      }
    }
    this.sources = [];
    this.nextStart = 0;
  }

  private startLevelLoop(): void {
    const an = this.analyser;
    if (!an) return;
    const data = new Uint8Array(an.frequencyBinCount);
    const loop = (): void => {
      an.getByteTimeDomainData(data);
      let sum = 0;
      for (const v of data) {
        const x = (v - 128) / 128;
        sum += x * x;
      }
      this.h.onLevel(Math.min(1, Math.sqrt(sum / data.length) * 3));
      this.raf = requestAnimationFrame(loop);
    };
    loop();
  }

  setMuted(m: boolean): void {
    this.muted = m;
  }

  stop(): void {
    this.closed = true;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = null;
    this.flushPlayback();
    try {
      this.ws?.send(JSON.stringify({ t: 'bye' }));
    } catch {
      /* yok say */
    }
    try {
      this.ws?.close();
    } catch {
      /* yok say */
    }
    this.stream?.getTracks().forEach((t) => t.stop());
    void this.captureCtx?.close().catch(() => undefined);
    void this.playCtx?.close().catch(() => undefined);
    this.ws = null;
  }
}
