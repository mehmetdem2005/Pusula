import type { Provider } from '@pusula/shared';

/**
 * USD per 1M tokens. Mayıs 2026.
 * Bu tablo `pricing.ts` üzerinden version'lı tutulur; günlük cron monitor + alarm önerilir.
 */
export const PRICING: Record<Provider, Record<string, { input: number; output: number }>> = {
  groq: {
    'llama-3.3-70b-versatile': { input: 0.59, output: 0.79 },
    'llama-3.1-8b-instant': { input: 0.05, output: 0.08 },
    'mixtral-8x7b-32768': { input: 0.24, output: 0.24 },
  },
  gemini: {
    'gemini-2.5-pro': { input: 1.25, output: 5.0 },
    'gemini-2.5-flash': { input: 0.3, output: 2.5 },
    'gemini-2.5-flash-lite': { input: 0.1, output: 0.4 },
  },
  deepseek: {
    'deepseek-chat': { input: 0.14, output: 0.28 },
    'deepseek-reasoner': { input: 0.55, output: 2.19 },
    'deepseek-v3.2': { input: 0.14, output: 0.28 },
    'deepseek-coder': { input: 0.14, output: 0.28 },
    'deepseek-vl2': { input: 0.2, output: 0.4 },
  },
  anthropic: {
    'claude-haiku-4-5': { input: 1.0, output: 5.0 },
    'claude-sonnet-4-6': { input: 3.0, output: 15.0 },
    'claude-opus-4-7': { input: 5.0, output: 25.0 },
  },
  openai: {
    'gpt-4o': { input: 2.5, output: 10.0 },
    'gpt-4o-mini': { input: 0.15, output: 0.6 },
  },
  openrouter: {
    // OpenRouter dynamic; varsayılan placeholder
  },
};

export function tahminiMaliyetUsd(
  provider: Provider,
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const m = PRICING[provider]?.[model];
  if (!m) return 0;
  return (inputTokens / 1_000_000) * m.input + (outputTokens / 1_000_000) * m.output;
}
