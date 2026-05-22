import type { Provider, TaskType } from '@pusula/shared';

export interface RouteCandidate {
  provider: Provider;
  model: string;
}

/**
 * Görev tipi → öncelik sırasıyla model adayları (failover için).
 * Kullanıcı override edebilir (Settings).
 */
export const DEFAULT_ROUTING: Record<TaskType, RouteCandidate[]> = {
  'quick-chat': [
    { provider: 'groq', model: 'llama-3.3-70b-versatile' },
    { provider: 'gemini', model: 'gemini-2.5-flash-lite' },
    { provider: 'deepseek', model: 'deepseek-chat' },
  ],
  'score-explanation': [
    { provider: 'deepseek', model: 'deepseek-chat' },
    { provider: 'deepseek', model: 'deepseek-v3.2' },
    { provider: 'groq', model: 'llama-3.3-70b-versatile' },
    { provider: 'anthropic', model: 'claude-haiku-4-5' },
  ],
  'marketing-copy': [
    { provider: 'anthropic', model: 'claude-sonnet-4-6' },
    { provider: 'gemini', model: 'gemini-2.5-pro' },
    { provider: 'deepseek', model: 'deepseek-chat' },
  ],
  reasoning: [
    { provider: 'deepseek', model: 'deepseek-reasoner' },
    { provider: 'anthropic', model: 'claude-opus-4-7' },
    { provider: 'gemini', model: 'gemini-2.5-pro' },
  ],
  vision: [
    { provider: 'gemini', model: 'gemini-2.5-flash' },
    { provider: 'gemini', model: 'gemini-2.5-pro' },
    { provider: 'deepseek', model: 'deepseek-vl2' },
    { provider: 'anthropic', model: 'claude-haiku-4-5' },
  ],
  'long-report': [
    { provider: 'gemini', model: 'gemini-2.5-pro' },
    { provider: 'anthropic', model: 'claude-sonnet-4-6' },
    { provider: 'deepseek', model: 'deepseek-chat' },
  ],
};
