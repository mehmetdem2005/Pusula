import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { loadEnv } from './config/env.schema.js';
import { SupabaseModule } from './supabase/supabase.module.js';
import { SentryModule } from './observability/sentry.module.js';
import { HealthModule } from './health/health.module.js';
import { QueueModule } from './queue/queue.module.js';
import { IlanlarModule } from './ilanlar/ilanlar.module.js';
import { ScoringModule } from './scoring/scoring.module.js';
import { LLMModule } from './llm/llm.module.js';
import { ChatModule } from './chat/chat.module.js';
import { AuthModule } from './auth/auth.module.js';
import { TelemetryModule } from './telemetry/telemetry.module.js';
import { VoiceModule } from './voice/voice.module.js';
import { AccountModule } from './account/account.module.js';

const env = loadEnv();

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      { name: 'default', ttl: env.THROTTLE_TTL_MS, limit: env.THROTTLE_LIMIT },
    ]),
    SentryModule,
    SupabaseModule,
    QueueModule,
    HealthModule,
    AuthModule,
    IlanlarModule,
    ScoringModule,
    LLMModule,
    ChatModule,
    TelemetryModule,
    VoiceModule,
    AccountModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
