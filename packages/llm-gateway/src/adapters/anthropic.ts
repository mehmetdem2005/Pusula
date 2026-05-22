import Anthropic from '@anthropic-ai/sdk';
import type { ChatMessage, ChatOptions, ChatResponse, Provider } from '@pusula/shared';
import { LLMError, type LLMAdapter } from './base.js';
import { tahminiMaliyetUsd } from '../pricing.js';

/**
 * Anthropic Claude adapter.
 * NOT: Anthropic CORS sağlamıyor → browser direct çağrı çalışmaz, backend proxy şart.
 */
export class AnthropicAdapter implements LLMAdapter {
  readonly provider: Provider = 'anthropic';

  supportsVision(model: string): boolean {
    return model.startsWith('claude-');
  }
  supportsJsonMode(_model: string): boolean {
    return true;
  }
  supportsTools(_model: string): boolean {
    return true;
  }

  private client(apiKey: string): Anthropic {
    return new Anthropic({ apiKey });
  }

  private toAnthropicMessages(messages: ChatMessage[]): {
    system?: string;
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  } {
    const sys = messages.find((m) => m.role === 'system');
    const rest = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
      }));
    return {
      system: sys ? (typeof sys.content === 'string' ? sys.content : JSON.stringify(sys.content)) : undefined,
      messages: rest,
    };
  }

  private mapError(err: unknown): never {
    const e = err as { status?: number; message?: string };
    let kind: ConstructorParameters<typeof LLMError>[1] = 'unknown';
    if (e.status === 401 || e.status === 403) kind = 'auth';
    else if (e.status === 429) kind = 'rate_limit';
    else if (e.status && e.status >= 500) kind = 'server';
    throw new LLMError(e.message ?? 'Anthropic error', kind, this.provider, err);
  }

  async chat(messages: ChatMessage[], options: ChatOptions, apiKey: string): Promise<ChatResponse> {
    const t0 = Date.now();
    const model = options.model ?? 'claude-sonnet-4-6';
    const { system, messages: msgs } = this.toAnthropicMessages(messages);
    try {
      const resp = await this.client(apiKey).messages.create({
        model,
        max_tokens: options.maxTokens ?? 4096,
        temperature: options.temperature ?? 0.7,
        system,
        messages: msgs,
      });
      const block = resp.content[0];
      const text = block && block.type === 'text' ? block.text : '';
      const usage = {
        input: resp.usage.input_tokens,
        output: resp.usage.output_tokens,
        total: resp.usage.input_tokens + resp.usage.output_tokens,
      };
      return {
        text,
        usage,
        cost_usd: tahminiMaliyetUsd(this.provider, model, usage.input, usage.output),
        provider: this.provider,
        model,
        finish_reason: resp.stop_reason ?? 'stop',
        latency_ms: Date.now() - t0,
      };
    } catch (err) {
      this.mapError(err);
    }
  }

  async *chatStream(
    messages: ChatMessage[],
    options: ChatOptions,
    apiKey: string
  ): AsyncIterable<{ delta: string; done: boolean; usage?: ChatResponse['usage'] }> {
    const model = options.model ?? 'claude-sonnet-4-6';
    const { system, messages: msgs } = this.toAnthropicMessages(messages);
    try {
      const stream = this.client(apiKey).messages.stream({
        model,
        max_tokens: options.maxTokens ?? 4096,
        temperature: options.temperature ?? 0.7,
        system,
        messages: msgs,
      });
      for await (const evt of stream) {
        if (evt.type === 'content_block_delta' && evt.delta.type === 'text_delta') {
          yield { delta: evt.delta.text, done: false };
        }
      }
      yield { delta: '', done: true };
    } catch (err) {
      this.mapError(err);
    }
  }
}
