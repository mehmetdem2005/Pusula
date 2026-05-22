import type { ChatMessage, ChatOptions, ChatResponse, Provider } from '@pusula/shared';

/**
 * LLM provider adapter sözleşmesi. Tüm adapter'lar (Groq, Gemini, DeepSeek, Anthropic)
 * bu arayüzü gerçekler. Caller (Gateway) provider'ı umursamaz.
 */
export interface LLMAdapter {
  readonly provider: Provider;

  /** Senkron chat çağrısı. */
  chat(messages: ChatMessage[], options: ChatOptions, apiKey: string): Promise<ChatResponse>;

  /** Streaming chat çağrısı. */
  chatStream(
    messages: ChatMessage[],
    options: ChatOptions,
    apiKey: string,
  ): AsyncIterable<{ delta: string; done: boolean; usage?: ChatResponse['usage'] }>;

  /** Model belirli bir feature'ı destekliyor mu? */
  supportsVision(model: string): boolean;
  supportsJsonMode(model: string): boolean;
  supportsTools(model: string): boolean;
}

export class LLMError extends Error {
  constructor(
    message: string,
    public readonly kind: 'auth' | 'rate_limit' | 'content' | 'network' | 'server' | 'unknown',
    public readonly provider: Provider,
    public override readonly cause?: unknown,
  ) {
    super(message);
  }
}
