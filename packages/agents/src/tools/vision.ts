/**
 * Vision LLM tool worker — Tier 3
 *
 * Multi-modal LLM çağrıları (Gemini 2.5 Flash, Claude Haiku 4.5 vision).
 * VisionAgent bu wrapper'ı kullanır.
 */

export interface VisionPromptRequest {
  prompt: string;
  imageUrls: string[];
  model: 'gemini-2.5-flash' | 'claude-haiku-4-5';
  jsonSchema?: object;
}

export interface VisionPromptResponse<T = unknown> {
  data: T;
  model_used: string;
  tokens_input: number;
  tokens_output: number;
  cost_usd: number;
}

export async function callVisionLLM<T>(_req: VisionPromptRequest): Promise<VisionPromptResponse<T>> {
  // TODO: @pusula/llm-gateway üzerinden multi-modal çağrı
  throw new Error('Not yet implemented — V1 sprint');
}
