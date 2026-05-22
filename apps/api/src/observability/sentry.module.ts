import { Global, Logger, Module, type OnModuleInit } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { loadEnv } from '../config/env.schema.js';

/** @sentry/node'un kullandığımız minimal yüzeyi. */
interface SentryEvent {
  request?: { headers?: Record<string, unknown> };
}
interface SentryLike {
  init(options: Record<string, unknown>): void;
  captureException(err: unknown, hint?: { extra?: Record<string, unknown> }): void;
}

/**
 * @sentry/node opsiyonel bağımlılık olduğundan specifier'ı değişken üzerinden
 * import ediyoruz; böylece TS modülü statik olarak çözmeye çalışmaz ve paket
 * yüklü değilse build/typecheck kırılmaz.
 */
async function loadSentry(): Promise<SentryLike | null> {
  const specifier = '@sentry/node';
  try {
    return (await import(specifier)) as unknown as SentryLike;
  } catch {
    return null;
  }
}

/**
 * Sentry wrapper. DSN tanımlıysa runtime'da @sentry/node ile init eder; yoksa no-op.
 *
 * Dinamik import sayesinde Sentry paket yüklü değilse modül yine ayağa kalkar
 * (development veya minimal deploy senaryoları için).
 */
@Injectable()
export class SentryService implements OnModuleInit {
  private readonly logger = new Logger(SentryService.name);
  private initialized = false;

  async onModuleInit(): Promise<void> {
    const env = loadEnv();
    if (!env.SENTRY_DSN) {
      this.logger.log('SENTRY_DSN tanımlı değil — error reporting devre dışı');
      return;
    }
    try {
      const Sentry = await loadSentry();
      if (!Sentry) {
        this.logger.warn('@sentry/node yüklü değil — error reporting devre dışı');
        return;
      }
      Sentry.init({
        dsn: env.SENTRY_DSN,
        environment: env.NODE_ENV,
        release: env.APP_VERSION,
        tracesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 1.0,
        profilesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 0,
        beforeSend(event: SentryEvent) {
          // PII redaksiyon — Authorization header'larını ve email'i sterilize
          if (event.request?.headers) {
            delete event.request.headers.authorization;
            delete event.request.headers.cookie;
          }
          return event;
        },
      });
      this.initialized = true;
      this.logger.log(`Sentry başlatıldı (env=${env.NODE_ENV})`);
    } catch (err) {
      this.logger.warn(`Sentry init başarısız: ${(err as Error).message}`);
    }
  }

  captureException(err: unknown, context?: Record<string, unknown>): void {
    if (!this.initialized) return;
    void (async () => {
      const Sentry = await loadSentry();
      if (!Sentry) return;
      Sentry.captureException(err, context ? { extra: context } : undefined);
    })();
  }
}

@Global()
@Module({
  providers: [SentryService],
  exports: [SentryService],
})
export class SentryModule {}
