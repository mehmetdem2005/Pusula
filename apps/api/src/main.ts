import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module.js';
import { loadEnv } from './config/env.schema.js';

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
  });

  const helmet = (await import('helmet')).default;
  const compression = (await import('compression')).default;
  app.use(helmet());
  app.use(compression());

  app.enableShutdownHooks();

  const allowedOrigins = env.CORS_ALLOWED_ORIGINS.split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const extIds = env.EXT_IDS.split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  app.enableCors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      if (origin.startsWith('chrome-extension://')) {
        const id = origin.replace('chrome-extension://', '');
        if (extIds.includes(id)) return cb(null, true);
      }
      cb(new Error(`CORS denied: ${origin}`));
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

  await app.listen(env.PORT, '0.0.0.0');
  logger.log(`🧭 Pusula API listening on :${env.PORT} (${env.NODE_ENV})`);
  logger.log(`CORS allowlist: [${allowedOrigins.join(', ')}]`);
}

bootstrap().catch((err: unknown) => {
  console.error('Bootstrap failed', err);
  process.exit(1);
});
