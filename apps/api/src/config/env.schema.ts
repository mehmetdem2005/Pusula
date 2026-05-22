import { z } from 'zod';

/**
 * Env şeması — bootstrap'ta fail-fast doğrulanır.
 * Eksik veya yanlış env varsa süreç başlamadan iner.
 */
export const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  APP_VERSION: z.string().default('0.0.0'),

  // DB & cache
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),

  // Supabase
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(20),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(40),
  SUPABASE_JWT_SECRET: z.string().min(20).optional(),

  // CORS
  CORS_ALLOWED_ORIGINS: z.string().default(''),
  EXT_IDS: z.string().default(''),

  // Observability
  SENTRY_DSN: z.string().url().optional().or(z.literal('')),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional().or(z.literal('')),
  OTEL_SERVICE_NAME: z.string().default('pusula-api'),
  POSTHOG_KEY: z.string().optional(),

  // Rate limit
  THROTTLE_TTL_MS: z.coerce.number().int().positive().default(60_000),
  THROTTLE_LIMIT: z.coerce.number().int().positive().default(60),
  THROTTLE_LLM_LIMIT: z.coerce.number().int().positive().default(20),
});

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | null = null;

export function loadEnv(): Env {
  if (cached) return cached;
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error('❌ Geçersiz environment değişkenleri:');

    console.error(JSON.stringify(parsed.error.format(), null, 2));
    process.exit(1);
  }
  cached = parsed.data;
  return cached;
}
