import { Logger } from '@nestjs/common';
import WebSocket from 'ws';

/**
 * Gemini Live (BidiGenerateContent) WebSocket istemcisi — sunucu tarafı.
 * API key burada kalır (tarayıcıya sızmaz). Relay bu oturumu bir tarayıcı WS'ine köprüler.
 * Protokol: https://ai.google.dev/api/live
 */
const HOST =
  'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent';

export interface GeminiLiveEvents {
  onReady: () => void;
  onAudio: (b64Pcm24: string) => void;
  onInputTx: (text: string) => void;
  onOutputTx: (text: string) => void;
  onInterrupted: () => void;
  onTurnEnd: () => void;
  onError: (msg: string) => void;
  onClose: (code: number, reason: string) => void;
}

export interface GeminiLiveOptions {
  apiKey: string;
  model: string;
  systemInstruction: string;
  languageCode?: string;
}

export interface GeminiLiveSession {
  sendAudioPcm16: (b64: string) => void;
  close: () => void;
}

interface GLServerContent {
  inputTranscription?: { text?: string };
  outputTranscription?: { text?: string };
  modelTurn?: { parts?: { inlineData?: { mimeType?: string; data?: string } }[] };
  interrupted?: boolean;
  turnComplete?: boolean;
}
interface GLMessage {
  setupComplete?: unknown;
  serverContent?: GLServerContent;
  error?: unknown;
}

export function openGeminiLive(opts: GeminiLiveOptions, ev: GeminiLiveEvents): GeminiLiveSession {
  const logger = new Logger('GeminiLive');
  const ws = new WebSocket(`${HOST}?key=${encodeURIComponent(opts.apiKey)}`);

  ws.on('open', () => {
    const model = opts.model.startsWith('models/') ? opts.model : `models/${opts.model}`;
    const setup = {
      setup: {
        model,
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: { languageCode: opts.languageCode ?? 'tr-TR' },
        },
        systemInstruction: { parts: [{ text: opts.systemInstruction }] },
        realtimeInputConfig: {
          automaticActivityDetection: {},
          activityHandling: 'START_OF_ACTIVITY_INTERRUPTS',
        },
        inputAudioTranscription: {},
        outputAudioTranscription: {},
      },
    };
    ws.send(JSON.stringify(setup));
  });

  ws.on('message', (data: WebSocket.RawData) => {
    let msg: GLMessage;
    try {
      msg = JSON.parse(data.toString()) as GLMessage;
    } catch {
      return;
    }
    if (msg.setupComplete) {
      ev.onReady();
      return;
    }
    const sc = msg.serverContent;
    if (sc) {
      if (sc.inputTranscription?.text) ev.onInputTx(sc.inputTranscription.text);
      if (sc.outputTranscription?.text) ev.onOutputTx(sc.outputTranscription.text);
      for (const p of sc.modelTurn?.parts ?? []) {
        const d = p.inlineData;
        if (d?.data && typeof d.mimeType === 'string' && d.mimeType.startsWith('audio/')) {
          ev.onAudio(d.data);
        }
      }
      if (sc.interrupted) ev.onInterrupted();
      if (sc.turnComplete) ev.onTurnEnd();
    }
    if (msg.error) {
      ev.onError(typeof msg.error === 'string' ? msg.error : JSON.stringify(msg.error));
    }
  });

  ws.on('error', (e: Error) => {
    logger.warn(`Gemini Live error: ${e.message}`);
    ev.onError(e.message);
  });
  ws.on('close', (code: number, reason: Buffer) => ev.onClose(code, reason.toString()));

  return {
    sendAudioPcm16(b64: string): void {
      if (ws.readyState !== WebSocket.OPEN) return;
      ws.send(
        JSON.stringify({
          realtimeInput: { audio: { mimeType: 'audio/pcm;rate=16000', data: b64 } },
        }),
      );
    },
    close(): void {
      try {
        ws.close();
      } catch {
        /* yok say */
      }
    },
  };
}
