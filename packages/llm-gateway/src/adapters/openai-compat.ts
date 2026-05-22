import OpenAI from 'openai';
import type { ChatMessage, ChatOptions, ChatResponse, Provider } from '@pusula/shared';
import { LLMError, type LLMAdapter } from './base.js';
import { tahminiMaliyetUsd } from '../pricing.js';

/**
 * OpenAI-uyumlu API kullanan provider'lar için ortak adapter.
 * Groq, DeepSeek, OpenRouter, OpenAI bu base'i extend eder.
 *
 * GÜVENLİK: `dangerouslyAllowBrowser` KAPALI. Bu adapter yalnız server-side
 * (apps/api) tarafında çağrılır. Browser/extension LLM çağrılarını
 * backend proxy üzerinden yapar.
 */
export abstract class OpenAICompatAdapter implements LLMAdapter {
  abstract readonly provider: Provider;
  protected abstract baseURL: string;

  abstract supportsVision(model: string): boolean;
  supportsJsonMode(_model: string): boolean {
    return true;
  }
  supportsTools(_model: string): boolean {
    return true;
  }

  protected client(apiKey: string): OpenAI {
    return new OpenAI({ apiKey, baseURL: this.baseURL });
  }

  private mapError(err: unknown): never {
    const e = err as { status?: number; message?: string };
    let kind: ConstructorParameters<typeof LLMError>[1] = 'unknown';
    if (e.status === 401 || e.status === 403) kind = 'auth';
    else if (e.status === 429) kind = 'rate_limit';
    else if (e.status === 400) kind = 'content';
    else if (e.status && e.status >= 500) kind = 'server';
    throw new LLMError(e.message ?? 'Unknown error', kind, this.provider, err);
  }

  async chat(messages: ChatMessage[], options: ChatOptions, apiKey: string): Promise<ChatResponse> {
    const t0 = Date.now();
    const model = options.model ?? 'unknown';
    try {
      // exactOptionalPropertyTypes uyumu: optional alanlar yalnız varsa nesneye konur.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const params: any = {
        model,
        messages: messages as never,
        temperature: options.temperature ?? 0.7,
      };
      if (options.maxTokens !== undefined) params.max_tokens = options.maxTokens;
      if (options.jsonSchema) params.response_format = { type: 'json_object' };

      const resp = await this.client(apiKey).chat.completions.create(params);
      const text = resp.choices[0]?.message?.content ?? '';
      const usage = {
        input: resp.usage?.prompt_tokens ?? 0,
        output: resp.usage?.completion_tokens ?? 0,
        total: resp.usage?.total_tokens ?? 0,
      };
      return {
        text,
        usage,
        cost_usd: tahminiMaliyetUsd(this.provider, model, usage.input, usage.output),
        provider: this.provider,
        model,
        finish_reason: resp.choices[0]?.finish_reason ?? 'stop',
        latency_ms: Date.now() - t0,
      };
    } catch (err) {
      this.mapError(err);
    }
  }

  async *chatStream(
    messages: ChatMessage[],
    options: ChatOptions,
    apiKey: string,
  ): AsyncIterable<{ delta: string; done: boolean; usage?: ChatResponse['usage'] }> {
    const model = options.model ?? 'unknown';
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const params: any = {
        model,
        messages: messages as never,
        temperature: options.temperature ?? 0.7,
        stream: true,
      };
      if (options.maxTokens !== undefined) params.max_tokens = options.maxTokens;

      // stream:true → SDK bir AsyncIterable döner; `any` params nedeniyle overload
      // non-stream'e çözüldüğünden açıkça stream tipine cast ediyoruz.
      const stream = (await this.client(apiKey).chat.completions.create(
        params,
      )) as unknown as AsyncIterable<{
        choices: { delta?: { content?: string | null } }[];
      }>;
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content ?? '';
        if (delta) yield { delta, done: false };
      }
      yield { delta: '', done: true };
    } catch (err) {
      this.mapError(err);
    }
  }
}
