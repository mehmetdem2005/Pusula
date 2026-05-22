import type { ChatMessage, ChatOptions, ChatResponse, Provider } from '@pusula/shared';
import { LLMError, type LLMAdapter } from './base.js';
import { tahminiMaliyetUsd } from '../pricing.js';

type GeminiPart = { text: string } | { inlineData: { mimeType: string; data: string } };

/**
 * Google Gemini adapter — minimal HTTP istemcisi.
 *
 * GÜVENLİK: API key URL query'sinde DEĞİL, `x-goog-api-key` header'ında gönderilir.
 * URL query'deki key log/referer/history'ye sızar.
 */
export class GeminiAdapter implements LLMAdapter {
  readonly provider: Provider = 'gemini';

  supportsVision(model: string): boolean {
    return model.startsWith('gemini-2.5') || model.startsWith('gemini-3');
  }
  supportsJsonMode(_model: string): boolean {
    return true;
  }
  supportsTools(_model: string): boolean {
    return true;
  }

  private endpoint(model: string, action: 'generateContent' | 'streamGenerateContent'): string {
    return `https://generativelanguage.googleapis.com/v1beta/models/${model}:${action}`;
  }

  /** ChatMessage içeriğini Gemini parts'a çevir — metin + görsel (inlineData). */
  private toParts(content: ChatMessage['content']): GeminiPart[] {
    if (typeof content === 'string') return [{ text: content }];
    const parts: GeminiPart[] = [];
    for (const p of content) {
      if (p.type === 'text') {
        parts.push({ text: p.text });
      } else if (p.type === 'image' && p.image_base64) {
        const m = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/s.exec(p.image_base64);
        if (m && m[1] && m[2]) parts.push({ inlineData: { mimeType: m[1], data: m[2] } });
        else parts.push({ inlineData: { mimeType: 'image/jpeg', data: p.image_base64 } });
      } else if (p.type === 'image' && p.image_url) {
        parts.push({ text: `[görsel: ${p.image_url}]` });
      }
    }
    return parts.length > 0 ? parts : [{ text: '' }];
  }

  private convertMessages(messages: ChatMessage[]): {
    systemInstruction?: { parts: GeminiPart[] };
    contents: { role: 'user' | 'model'; parts: GeminiPart[] }[];
  } {
    const sys = messages.find((m) => m.role === 'system');
    const rest = messages.filter((m) => m.role !== 'system');
    const out: {
      systemInstruction?: { parts: GeminiPart[] };
      contents: { role: 'user' | 'model'; parts: GeminiPart[] }[];
    } = {
      contents: rest.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: this.toParts(m.content),
      })),
    };
    if (sys) {
      out.systemInstruction = { parts: this.toParts(sys.content) };
    }
    return out;
  }

  async chat(messages: ChatMessage[], options: ChatOptions, apiKey: string): Promise<ChatResponse> {
    const t0 = Date.now();
    const model = options.model ?? 'gemini-2.5-flash';
    const body = {
      ...this.convertMessages(messages),
      generationConfig: {
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: options.maxTokens,
        responseMimeType: options.jsonSchema ? 'application/json' : 'text/plain',
      },
    };
    try {
      const res = await fetch(this.endpoint(model, 'generateContent'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errText = await res.text();
        const kind =
          res.status === 429
            ? 'rate_limit'
            : res.status === 401 || res.status === 403
              ? 'auth'
              : res.status >= 500
                ? 'server'
                : 'unknown';
        throw new LLMError(`Gemini ${res.status}: ${errText}`, kind, this.provider);
      }
      const data = (await res.json()) as {
        candidates: { content: { parts: { text: string }[] }; finishReason: string }[];
        usageMetadata: { promptTokenCount: number; candidatesTokenCount: number };
      };
      const text = data.candidates[0]?.content?.parts?.[0]?.text ?? '';
      const usage = {
        input: data.usageMetadata.promptTokenCount,
        output: data.usageMetadata.candidatesTokenCount,
        total: data.usageMetadata.promptTokenCount + data.usageMetadata.candidatesTokenCount,
      };
      return {
        text,
        usage,
        cost_usd: tahminiMaliyetUsd(this.provider, model, usage.input, usage.output),
        provider: this.provider,
        model,
        finish_reason: data.candidates[0]?.finishReason ?? 'stop',
        latency_ms: Date.now() - t0,
      };
    } catch (err) {
      if (err instanceof LLMError) throw err;
      throw new LLMError((err as Error).message, 'network', this.provider, err);
    }
  }

  async *chatStream(
    messages: ChatMessage[],
    options: ChatOptions,
    apiKey: string,
  ): AsyncIterable<{ delta: string; done: boolean; usage?: ChatResponse['usage'] }> {
    const model = options.model ?? 'gemini-2.5-flash';
    const body = {
      ...this.convertMessages(messages),
      generationConfig: {
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: options.maxTokens,
      },
    };
    const res = await fetch(`${this.endpoint(model, 'streamGenerateContent')}?alt=sse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok || !res.body) {
      throw new LLMError(`Gemini stream ${res.status}`, 'network', this.provider);
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const json = JSON.parse(line.slice(6)) as {
            candidates?: { content?: { parts?: { text?: string }[] } }[];
          };
          const txt = json.candidates?.[0]?.content?.parts?.[0]?.text;
          if (txt) yield { delta: txt, done: false };
        } catch {
          // SSE parse hata — ignore
        }
      }
    }
    yield { delta: '', done: true };
  }
}
