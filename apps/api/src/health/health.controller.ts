import { Controller, Get, Inject, Logger } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE } from '../supabase/supabase.module.js';
import { loadEnv } from '../config/env.schema.js';

interface ProbeResult {
  ok: boolean;
  latency_ms: number;
  message?: string;
}

@Controller()
export class HealthController {
  private readonly logger = new Logger(HealthController.name);
  constructor(@Inject(SUPABASE) private readonly sb: SupabaseClient) {}

  /** /v1/healthz — liveness probe (k8s/render için). Bağımlılık çağrısı YOK. */
  @Get('healthz')
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  liveness() {
    const env = loadEnv();
    return { status: 'ok', ts: Date.now(), version: env.APP_VERSION };
  }

  /** /v1/readyz — readiness probe: DB + Redis (varsa) erişimi. */
  @Get('readyz')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async readiness(): Promise<{
    status: 'ready' | 'degraded' | 'down';
    checks: Record<string, ProbeResult>;
  }> {
    const db = await this.probeDb();
    const redis = await this.probeRedis();
    const all = { db, redis };
    const status = db.ok && redis.ok ? 'ready' : db.ok || redis.ok ? 'degraded' : 'down';
    if (status !== 'ready') {
      this.logger.warn(`Readiness ${status}`, { checks: all });
    }
    return { status, checks: all };
  }

  private async probeDb(): Promise<ProbeResult> {
    const t = Date.now();
    try {
      // Hafif sorgu — RLS olmadan service-role ile bir satır oku
      const { error } = await this.sb.from('users').select('id').limit(1);
      if (error) {
        return { ok: false, latency_ms: Date.now() - t, message: error.message };
      }
      return { ok: true, latency_ms: Date.now() - t };
    } catch (err) {
      return { ok: false, latency_ms: Date.now() - t, message: (err as Error).message };
    }
  }

  private async probeRedis(): Promise<ProbeResult> {
    const t = Date.now();
    const env = loadEnv();
    try {
      const { Redis } = await import('ioredis').catch(() => ({ Redis: null }) as never);
      if (!Redis) {
        return { ok: false, latency_ms: 0, message: 'ioredis paket yok' };
      }
      // Lazy connect — singleton istemediğimiz için her probe'ta yeni client
      const client = new Redis(env.REDIS_URL, {
        lazyConnect: true,
        connectTimeout: 1500,
        maxRetriesPerRequest: 1,
      });
      await client.connect();
      const pong = await client.ping();
      await client.quit();
      return { ok: pong === 'PONG', latency_ms: Date.now() - t };
    } catch (err) {
      return { ok: false, latency_ms: Date.now() - t, message: (err as Error).message };
    }
  }
}
