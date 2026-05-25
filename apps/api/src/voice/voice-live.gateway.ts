import { Logger } from '@nestjs/common';
import type { Server, IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import WebSocket, { WebSocketServer } from 'ws';
import { loadEnv } from '../config/env.schema.js';
import { openGeminiLive } from './gemini-live.client.js';

/** Sesli danışman personası (kısa, sohbet dili — sesli yanıta uygun). */
const PERSONA = [
  "Sen Pusula'nın sesli emlak danışmanısın. Sesli yanıta uygun konuş: KISA, sohbet dilinde,",
  'madde işareti/markdown yok, en fazla 2-3 cümle. Aşağıdaki JSON kullanıcının tüm listelerine',
  've Favorilerim’e kaydettiği ilanlar (skor/etiket dahil); karşılaştır, kelepiri bul, öneride',
  'bulun. Skoru DEĞİŞTİRME, yalnız yorumla.',
].join(' ');

interface SavedContextProvider {
  getSavedContext(userId: string): Promise<{ items: unknown[] }>;
}

interface ClientMsg {
  t?: string;
  d?: string;
}

function send(ws: WebSocket, obj: unknown): void {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
}

/**
 * Tarayıcı ↔ Gemini Live köprüsü. HTTP server'ın 'upgrade' olayına bağlanır (path /v1/voice/live).
 * Auth: ?token=<supabaseJWT> (WS handshake'te header güvenilir gönderilemez). Kota: gün/dakika.
 */
export function attachVoiceLiveRelay(server: Server, deps: { lists: SavedContextProvider }): void {
  const env = loadEnv();
  const logger = new Logger('VoiceLiveRelay');
  const supabaseUrl = process.env.SUPABASE_URL ?? '';
  const issuer = `${supabaseUrl}/auth/v1`;
  const jwks = supabaseUrl
    ? createRemoteJWKSet(new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`))
    : null;

  const wss = new WebSocketServer({ noServer: true });

  // Basit in-memory kota (instance başına; redeploy'da sıfırlanır — v1 guardrail).
  const usage = new Map<string, { day: string; sec: number }>();
  const today = (): string => new Date().toISOString().slice(0, 10);
  const usedMin = (uid: string): number => {
    const u = usage.get(uid);
    return u && u.day === today() ? u.sec / 60 : 0;
  };
  const addSec = (uid: string, sec: number): void => {
    const d = today();
    const u = usage.get(uid);
    if (u && u.day === d) u.sec += sec;
    else usage.set(uid, { day: d, sec });
  };

  server.on('upgrade', (req: IncomingMessage, socket: Duplex, head: Buffer) => {
    let pathname = '';
    try {
      pathname = new URL(req.url ?? '', 'http://localhost').pathname;
    } catch {
      pathname = '';
    }
    if (pathname !== '/v1/voice/live') return; // başka upgrade handler'ı yok → yok say
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
  });

  wss.on('connection', (cws: WebSocket, req: IncomingMessage) => {
    void (async (): Promise<void> => {
      const url = new URL(req.url ?? '', 'http://localhost');
      const token = url.searchParams.get('token') ?? '';
      let userId = '';
      try {
        if (!jwks) throw new Error('jwks');
        const { payload } = await jwtVerify(token, jwks, {
          audience: 'authenticated',
          issuer,
          algorithms: ['RS256', 'ES256'],
        });
        if (typeof payload.sub !== 'string') throw new Error('sub');
        userId = payload.sub;
      } catch {
        cws.close(1008, 'auth');
        return;
      }

      if (!env.MANAGED_GEMINI_KEY) {
        send(cws, { t: 'error', m: 'voice-disabled' });
        cws.close(1011, 'no-key');
        return;
      }
      if (usedMin(userId) >= env.VOICE_LIVE_MAX_MIN_PER_DAY) {
        send(cws, { t: 'quota' });
        cws.close(1011, 'quota');
        return;
      }

      const startedAt = Date.now();
      let ctx = '';
      try {
        const saved = await deps.lists.getSavedContext(userId);
        ctx = JSON.stringify(saved).slice(0, 12000);
      } catch {
        ctx = '{"items":[]}';
      }
      const systemInstruction = `${PERSONA}\n\nKAYITLI İLANLAR (JSON): ${ctx}`;

      const g = openGeminiLive(
        { apiKey: env.MANAGED_GEMINI_KEY, model: env.VOICE_LIVE_MODEL, systemInstruction },
        {
          onReady: () => send(cws, { t: 'ready' }),
          onAudio: (d) => send(cws, { t: 'audio', d }),
          onInputTx: (text) => send(cws, { t: 'in_tx', text }),
          onOutputTx: (text) => send(cws, { t: 'out_tx', text }),
          onInterrupted: () => send(cws, { t: 'interrupted' }),
          onTurnEnd: () => send(cws, { t: 'turn_end' }),
          onError: (m) => send(cws, { t: 'error', m }),
          onClose: () => {
            try {
              cws.close();
            } catch {
              /* yok say */
            }
          },
        },
      );

      cws.on('message', (data: WebSocket.RawData, isBinary: boolean) => {
        if (isBinary) {
          g.sendAudioPcm16((data as Buffer).toString('base64'));
          return;
        }
        try {
          const msg = JSON.parse(data.toString()) as ClientMsg;
          if (msg.t === 'audio' && typeof msg.d === 'string') g.sendAudioPcm16(msg.d);
          else if (msg.t === 'bye') cws.close(1000, 'bye');
        } catch {
          /* yok say */
        }
      });

      const cleanup = (): void => {
        addSec(userId, Math.round((Date.now() - startedAt) / 1000));
        g.close();
      };
      cws.on('close', cleanup);
      cws.on('error', cleanup);
    })();
  });

  logger.log('Voice Live relay hazır: /v1/voice/live');
}
