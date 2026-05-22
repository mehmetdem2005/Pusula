import { loadEnv } from '../config/env.schema.js';

/**
 * Pino logger config — nestjs-pino LoggerModule.forRoot() için.
 * Paket yüklüyse main.ts içinde kullanılır; yüklü değilse default Nest Logger.
 */
export function pinoConfig() {
  const env = loadEnv();
  return {
    pinoHttp: {
      level: env.LOG_LEVEL,
      autoLogging: true,
      redact: {
        paths: [
          'req.headers.authorization',
          'req.headers.cookie',
          'req.headers["x-supabase-auth"]',
          'res.headers["set-cookie"]',
          '*.password',
          '*.api_key',
          '*.encrypted_key',
        ],
        remove: true,
      },
      genReqId: (req: { headers: Record<string, string | string[] | undefined> }) => {
        const h = req.headers['x-request-id'];
        return typeof h === 'string' ? h : crypto.randomUUID();
      },
      serializers: {
        req(req: { method: string; url: string; id: string }) {
          return { id: req.id, method: req.method, url: req.url };
        },
      },
      transport:
        env.NODE_ENV === 'development'
          ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss.l' } }
          : undefined,
    },
  };
}
