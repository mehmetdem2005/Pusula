import { Inject, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ChatMessage, ChatOptions, ChatResponse, Provider } from '@pusula/shared';
import { LLMGateway, ByokKeyResolver } from '@pusula/llm-gateway';
import { SUPABASE } from '../supabase/supabase.module.js';

@Injectable()
export class LLMService {
  private readonly logger = new Logger(LLMService.name);

  constructor(@Inject(SUPABASE) private readonly sb: SupabaseClient) {}

  /**
   * Sunucu-side LLM çağrı proxy'si. Browser'dan asla doğrudan provider'a gidilmez.
   * Usage event'i DB'ye loglanır (quota / billing / abuse detection için).
   */
  async chat(
    userId: string,
    messages: ChatMessage[],
    options: ChatOptions,
    providerKeys: Partial<Record<Provider, string>>,
  ): Promise<ChatResponse> {
    const gateway = new LLMGateway({
      keyResolver: new ByokKeyResolver(providerKeys),
      onUsage: async (resp, keySource) => {
        const { error } = await this.sb.from('usage_events').insert({
          id: undefined,
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
    const response = await gateway.chat(messages, options);
    void randomUUID; // keep import alive for future request_id correlation
    return response;
  }
}
