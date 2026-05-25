import { Inject, Injectable, Logger } from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ChatMessage, ChatOptions, ChatResponse, Provider } from '@pusula/shared';
import { LLMGateway, ByokKeyResolver, PlatformPoolResolver } from '@pusula/llm-gateway';
import { SUPABASE } from '../supabase/supabase.module.js';

export interface ModelOption {
  provider: 'groq' | 'gemini' | 'deepseek';
  model: string;
}

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
    const gateway = this.buildGateway(userId, options, providerKeysFromBody);
    return gateway.chat(messages, options);
  }

  /**
   * Streaming sohbet (SSE) — token'lar geldikçe akar; sesli yanıtın "tüm metni bekleme"
   * gecikmesini ortadan kaldırır. Gateway.chatStream tek aday kullanır (failover yok); hata
   * olursa controller error event'i yazar, client non-streaming /chat'e (failover'lı) düşer.
   * NOT: streaming yolunda usage_events loglanmaz (quick-chat ucuz/ücretsiz modeller). Maliyet
   * takibi gereken pahalı işlemler (extract/score) zaten non-streaming chat() üzerinden gider.
   */
  chatStream(
    userId: string,
    messages: ChatMessage[],
    options: ChatOptions,
    providerKeysFromBody: Partial<Record<Provider, string>>,
  ): AsyncIterable<{ delta: string; done: boolean }> {
    const gateway = this.buildGateway(userId, options, providerKeysFromBody);
    return gateway.chatStream(messages, options);
  }

  private buildGateway(
    userId: string,
    options: ChatOptions,
    providerKeysFromBody: Partial<Record<Provider, string>>,
  ): LLMGateway {
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

    return new LLMGateway({
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
  }

  private modelsCache: { at: number; data: ModelOption[] } | null = null;
  private static readonly MODELS_TTL_MS = 60 * 60 * 1000;

  /**
   * Platform key'lerinin desteklediği chat modelleri (seçici için).
   * Her sağlayıcının /models ucundan canlı çekilir → ses/görsel/embedding modelleri elenir.
   * 1 saat in-memory cache (model listesi sık değişmez).
   */
  async listModels(): Promise<ModelOption[]> {
    if (this.modelsCache && Date.now() - this.modelsCache.at < LLMService.MODELS_TTL_MS) {
      return this.modelsCache.data;
    }
    const out: ModelOption[] = [];

    const deepseekKey = process.env.MANAGED_DEEPSEEK_KEY;
    if (deepseekKey) {
      const ids = await this.fetchOpenAIModelIds('https://api.deepseek.com/models', deepseekKey);
      for (const id of ids) out.push({ provider: 'deepseek', model: id });
    }

    const groqKey = process.env.MANAGED_GROQ_KEY;
    if (groqKey) {
      const ids = await this.fetchOpenAIModelIds('https://api.groq.com/openai/v1/models', groqKey);
      for (const id of ids) {
        if (/whisper|tts|guard|orpheus/i.test(id)) continue; // ses/moderasyon modelleri
        out.push({ provider: 'groq', model: id });
      }
    }

    const geminiKey = process.env.MANAGED_GEMINI_KEY;
    if (geminiKey) {
      const ids = await this.fetchGeminiModelIds(geminiKey);
      for (const id of ids) {
        // görsel/ses/müzik/embedding/araştırma/robotik/bilgisayar-kullanımı modellerini ele
        if (
          /embedding|aqa|imagen|image|tts|robotics|lyria|nano-banana|computer-use|deep-research|antigravity/i.test(
            id,
          )
        ) {
          continue;
        }
        out.push({ provider: 'gemini', model: id });
      }
    }

    this.modelsCache = { at: Date.now(), data: out };
    return out;
  }

  private async fetchOpenAIModelIds(url: string, apiKey: string): Promise<string[]> {
    try {
      const r = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` } });
      if (!r.ok) return [];
      const j = (await r.json()) as { data?: { id?: string }[] };
      return (j.data ?? []).map((m) => m.id).filter((id): id is string => !!id);
    } catch {
      return [];
    }
  }

  private async fetchGeminiModelIds(apiKey: string): Promise<string[]> {
    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      );
      if (!r.ok) return [];
      const j = (await r.json()) as {
        models?: { name?: string; supportedGenerationMethods?: string[] }[];
      };
      return (j.models ?? [])
        .filter((m) => m.supportedGenerationMethods?.includes('generateContent'))
        .map((m) => (m.name ?? '').replace(/^models\//, ''))
        .filter(Boolean);
    } catch {
      return [];
    }
  }
}
