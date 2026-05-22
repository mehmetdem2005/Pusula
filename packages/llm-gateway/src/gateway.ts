import type { ChatMessage, ChatOptions, ChatResponse, Provider } from '@pusula/shared';
import { LLMError, type LLMAdapter } from './adapters/base.js';
import { GroqAdapter } from './adapters/groq.js';
import { DeepSeekAdapter } from './adapters/deepseek.js';
import { GeminiAdapter } from './adapters/gemini.js';
import { AnthropicAdapter } from './adapters/anthropic.js';
import { DEFAULT_ROUTING } from './routing.js';
import type { KeyResolver } from './key-resolver.js';

export interface GatewayConfig {
  keyResolver: KeyResolver;
  /** Kullanıcı override'lı routing (yoksa DEFAULT_ROUTING). */
  routing?: typeof DEFAULT_ROUTING;
  /** Failover ne kadar adım dener? */
  maxFailoverAttempts?: number;
  /** Her başarılı/başarısız çağrı için callback (usage tracker). */
  onUsage?: (event: ChatResponse, keySource: KeyResolver['source']) => Promise<void> | void;
}

const ADAPTERS: Record<Provider, LLMAdapter> = {
  groq: new GroqAdapter(),
  deepseek: new DeepSeekAdapter(),
  gemini: new GeminiAdapter(),
  anthropic: new AnthropicAdapter(),
  // openai ve openrouter MVP'de yok — V1+
  openai: new GroqAdapter(), // placeholder
  openrouter: new GroqAdapter(), // placeholder
};

/**
 * Ana LLM Gateway — provider-agnostic chat() arayüzü, otomatik failover, usage tracking.
 */
export class LLMGateway {
  constructor(private config: GatewayConfig) {}

  async chat(messages: ChatMessage[], options: ChatOptions): Promise<ChatResponse> {
    const candidates = this.candidateRoutes(options);
    const maxAttempts = Math.min(this.config.maxFailoverAttempts ?? 3, candidates.length);

    let lastError: unknown = null;
    for (let i = 0; i < maxAttempts; i++) {
      const cand = candidates[i];
      if (!cand) break;
      const adapter = ADAPTERS[cand.provider];

      try {
        const apiKey = await this.config.keyResolver.getKey(cand.provider);
        const resp = await adapter.chat(
          messages,
          { ...options, provider: cand.provider, model: cand.model },
          apiKey,
        );
        await this.config.onUsage?.(resp, this.config.keyResolver.source);
        return resp;
      } catch (err) {
        lastError = err;
        if (
          err instanceof LLMError &&
          (err.kind === 'rate_limit' || err.kind === 'server' || err.kind === 'network')
        ) {
          continue; // failover
        }
        throw err; // auth/content → fail fast
      }
    }
    throw lastError ?? new Error('LLM Gateway: all candidates failed');
  }

  async *chatStream(
    messages: ChatMessage[],
    options: ChatOptions,
  ): AsyncIterable<{ delta: string; done: boolean }> {
    const candidates = this.candidateRoutes(options);
    const cand = candidates[0];
    if (!cand) throw new Error('No route for taskType: ' + options.taskType);
    const adapter = ADAPTERS[cand.provider];
    const apiKey = await this.config.keyResolver.getKey(cand.provider);
    yield* adapter.chatStream(
      messages,
      { ...options, provider: cand.provider, model: cand.model },
      apiKey,
    );
  }

  private candidateRoutes(options: ChatOptions) {
    if (options.provider && options.model) {
      return [{ provider: options.provider, model: options.model }];
    }
    const routing = this.config.routing ?? DEFAULT_ROUTING;
    return routing[options.taskType];
  }
}
