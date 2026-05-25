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
  SUPABASE_JWT_SECRET: z.string().min(20).optional().or(z.literal('')),

  // CORS
  CORS_ALLOWED_ORIGINS: z.string().default(''),
  EXT_IDS: z.string().default(''),

  // Platform LLM havuzu (key girişsiz AI). Tanımlı değilse ilgili sağlayıcı kullanılamaz.
  MANAGED_GROQ_KEY: z.string().optional(),
  MANAGED_GEMINI_KEY: z.string().optional(),
  MANAGED_DEEPSEEK_KEY: z.string().optional(),
  MANAGED_ANTHROPIC_KEY: z.string().optional(),

  // Observability
  SENTRY_DSN: z.string().url().optional().or(z.literal('')),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional().or(z.literal('')),
  OTEL_SERVICE_NAME: z.string().default('pusula-api'),
  POSTHOG_KEY: z.string().optional(),

  // Rate limit
  THROTTLE_TTL_MS: z.coerce.number().int().positive().default(60_000),
  THROTTLE_LIMIT: z.coerce.number().int().positive().default(60),
  THROTTLE_LLM_LIMIT: z.coerce.number().int().positive().default(20),

  // ── AI video (Faz 3) — sağlayıcı yoksa 'mock' (gerçek çıktı üretmez, akış çalışır).
  VIDEO_PROVIDER: z.enum(['mock', 'veo', 'runway', 'kling']).default('mock'),
  VIDEO_PROVIDER_API_KEY: z.string().optional(),
  VIDEO_MAX_PER_USER_DAY: z.coerce.number().int().positive().default(3),
  VIDEO_MAX_COST_USD_DAY: z.coerce.number().positive().default(5),

  // ── Realtime sesli sohbet (Gemini Live) — MANAGED_GEMINI_KEY ile çalışır.
  VOICE_LIVE_MODEL: z.string().default('gemini-2.5-flash-native-audio-latest'),
  VOICE_LIVE_MAX_MIN_PER_DAY: z.coerce.number().int().positive().default(30),
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
