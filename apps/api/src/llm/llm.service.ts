import { Inject, Injectable, Logger } from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ChatMessage, ChatOptions, ChatResponse, Provider } from '@pusula/shared';
import { LLMGateway, ByokKeyResolver, PlatformPoolResolver } from '@pusula/llm-gateway';
import { SUPABASE } from '../supabase/supabase.module.js';

@Injectable()
export class LLMService {
  private readonly logger = new Logger(LLMService.name);

  constructor(@Inject(SUPABASE) private readonly sb: SupabaseClient) {}

  /**
   * Key modeli (karma):
   *  - Varsayılan: PLATFORM havuzu (server-side MANAGED_*_KEY). Kullanıcı key girmez.
   *    key_source='platform_pool' loglanır.
   *  - Opsiyonel: kullanıcı body'de provider_keys gönderirse BYOK (gelişmiş kullanıcı).
   *
   * Tüm çağrılar usage_events tablosuna loglanır.
   */
  async chat(
    userId: string,
    messages: ChatMessage[],
    options: ChatOptions,
    providerKeysFromBody: Partial<Record<Provider, string>>,
  ): Promise<ChatResponse> {
    const hasByok = Object.values(providerKeysFromBody).some((v) => !!v);

    const keyResolver = hasByok
      ? new ByokKeyResolver(providerKeysFromBody)
      : new PlatformPoolResolver((provider) => {
          const managed: Record<string, string | undefined> = {
            groq: process.env.MANAGED_GROQ_KEY,
            gemini: process.env.MANAGED_GEMINI_KEY,
            deepseek: process.env.MANAGED_DEEPSEEK_KEY,
            anthropic: process.env.MANAGED_ANTHROPIC_KEY,
          };
          const k = managed[provider];
          return k
            ? Promise.resolve(k)
            : Promise.reject(new Error(`Platform key tanımlı değil: ${provider}`));
        });

    const gateway = new LLMGateway({
      keyResolver,
      onUsage: async (resp, keySource) => {
        const { error } = await this.sb.from('usage_events').insert({
          user_id: userId,
          provider: resp.provider,
          model: resp.model,
          task_type: options.taskType,
          input_tokens: resp.usage.input,
          output_tokens: resp.usage.output,
          cost_usd: resp.cost_usd,
          latency_ms: resp.latency_ms,
          key_source: keySource,
        });
        if (error) this.logger.warn(`usage_events insert failed: ${error.message}`);
      },
    });

    return gateway.chat(messages, options);
  }
}
