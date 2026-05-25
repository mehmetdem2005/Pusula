import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { loadEnv } from './config/env.schema.js';
import { ListsService } from './lists/lists.service.js';
import { attachVoiceLiveRelay } from './voice/voice-live.gateway.js';

/**
 * Pusula API bootstrap.
 *
 * Sorumluluklar:
 *  - Env şemasını fail-fast doğrula
 *  - Güvenlik middleware'leri (helmet, compression)
 *  - CORS allowlist (env'den; regex değil)
 *  - /health ve /ready endpoint'leri
 *  - Graceful shutdown
 */
async function bootstrap(): Promise<void> {
  const env = loadEnv();
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    cors: false,
    bodyParser: false,
  });

  const helmet = (await import('helmet')).default;
  const compression = (await import('compression')).default;
  app.use(helmet());
  app.use(compression());
  // Görüntü-tabanlı extract (büyük base64) için body limiti — express'i doğrudan import etmeden
  // Nest'in (platform-express dahili) body parser'ını kullan.
  const expressApp = app as unknown as NestExpressApplication;
  expressApp.useBodyParser('json', { limit: '15mb' });
  expressApp.useBodyParser('urlencoded', { extended: true, limit: '15mb' });

  app.enableShutdownHooks();

  const allowedOrigins = env.CORS_ALLOWED_ORIGINS.split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const extIds = env.EXT_IDS.split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  // Vercel her deployment/preview'a `pusula-<hash>-...vercel.app` URL'i atar; kullanıcı canonical
  // alias yerine bunlardan birine girebilir. Host'u parse ederek tüm `*.vercel.app` alt-alanlarını
  // kabul et (path/fragment trick'lerine karşı güvenli).
  const isVercelOrigin = (origin: string): boolean => {
    try {
      const host = new URL(origin).hostname;
      return host === 'vercel.app' || host.endsWith('.vercel.app');
    } catch {
      return false;
    }
  };

  app.enableCors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      if (isVercelOrigin(origin)) return cb(null, true);
      if (origin.startsWith('chrome-extension://')) {
        const id = origin.replace('chrome-extension://', '');
        if (extIds.includes(id)) return cb(null, true);
      }
      // Reddedilen origin'de Error FIRLATMA → preflight 500 olur, tarayıcı "Failed to fetch" der.
      // `false` döndür: temiz CORS bloğu (allow-origin header'sız 204), 500 değil.
      cb(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'Idempotency-Key'],
    maxAge: 86400,
  });

  const httpAdapter = app.getHttpAdapter();
  httpAdapter.get('/health', (_req: unknown, res: { json: (b: unknown) => void }) => {
    res.json({ status: 'ok', ts: Date.now(), version: env.APP_VERSION });
  });
  httpAdapter.get('/ready', (_req: unknown, res: { json: (b: unknown) => void }) => {
    res.json({ status: 'ready' });
  });

  app.setGlobalPrefix('v1', { exclude: ['health', 'ready'] });

  // Realtime sesli sohbet: HTTP server'a WS relay bağla (path /v1/voice/live).
  attachVoiceLiveRelay(app.getHttpServer(), { lists: app.get(ListsService) });

  await app.listen(env.PORT, '0.0.0.0');
  logger.log(`🧭 Pusula API listening on :${env.PORT} (${env.NODE_ENV})`);
  logger.log(`CORS allowlist: [${allowedOrigins.join(', ')}]`);
}

bootstrap().catch((err: unknown) => {
  console.error('Bootstrap failed', err);
  process.exit(1);
});
