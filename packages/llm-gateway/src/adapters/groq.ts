import type { Provider } from '@pusula/shared';
import { OpenAICompatAdapter } from './openai-compat.js';

export class GroqAdapter extends OpenAICompatAdapter {
  readonly provider: Provider = 'groq';
  protected baseURL = 'https://api.groq.com/openai/v1';

  supportsVision(_model: string): boolean {
    return false; // Groq vision desteği henüz sınırlı
  }
}
