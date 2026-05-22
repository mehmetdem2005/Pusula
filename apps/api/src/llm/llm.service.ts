import { Inject, Injectable, Logger } from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ChatMessage, ChatOptions, ChatResponse, Provider } from '@pusula/shared';
import { LLMGateway, ByokKeyResolver } from '@pusula/llm-gateway';
import { SUPABASE } from '../supabase/supabase.module.js';

@Injectable()
export class LLMService {
  private readonly logger = new Logger(LLMService.name);

  constructor(@Inject(SUPABASE) private readonly sb: SupabaseClient) {}

  /**
   * Provider key resolution priority:
   *  1. Body'den gelen provider_keys (BYOK — kullanıcı tarayıcısından)
   *  2. Env'den MANAGED_*_KEY (managed pool fallback)
   *
   * Tüm çağrılar usage_events tablosuna loglanır.
   */
  async chat(
    userId: string,
    messages: ChatMessage[],
    options: ChatOptions,
    providerKeysFromBody: Partial<Record<Provider, string>>,
  ): Promise<ChatResponse> {
    const merged: Partial<Record<Provider, string>> = {};
    const assign = (p: Provider, value: string | undefined): void => {
      if (value) merged[p] = value;
    };
    assign('groq', providerKeysFromBody.groq ?? process.env.MANAGED_GROQ_KEY);
    assign('gemini', providerKeysFromBody.gemini ?? process.env.MANAGED_GEMINI_KEY);
    assign('deepseek', providerKeysFromBody.deepseek ?? process.env.MANAGED_DEEPSEEK_KEY);
    assign('anthropic', providerKeysFromBody.anthropic ?? process.env.MANAGED_ANTHROPIC_KEY);

    const gateway = new LLMGateway({
      keyResolver: new ByokKeyResolver(merged),
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
