import type { Provider } from '@pusula/shared';
import { OpenAICompatAdapter } from './openai-compat.js';

export class DeepSeekAdapter extends OpenAICompatAdapter {
  readonly provider: Provider = 'deepseek';
  protected baseURL = 'https://api.deepseek.com/v1';

  supportsVision(_model: string): boolean {
    return false; // V3/R1 vision yok
  }
}
