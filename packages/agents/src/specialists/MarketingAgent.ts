/**
 * MarketingAgent — Tier 1
 * docs/11-multi-agent-mimarisi.md §4.9
 */
import type { z } from 'zod';
import { MarketingRequest, MarketingResponse } from '../contracts/marketing.js';
import type { Logger } from '../runtime/Logger.js';
import type { LLMGateway } from '@pusula/llm-gateway';

export class MarketingAgent {
  static readonly name = 'marketing' as const;
  static readonly inputSchema = MarketingRequest;
  static readonly outputSchema = MarketingResponse;

  constructor(
    private llmGateway: LLMGateway,
    private logger: Logger,
  ) {}

  async handle(req: z.infer<typeof MarketingRequest>): Promise<z.infer<typeof MarketingResponse>> {
    this.logger.info('MarketingAgent.handle', { trace_id: req.trace_id, format: req.format });

    // TODO: Claude Sonnet 4.6 ile format-spesifik pazarlama metni
    return {
      metin: `[STUB] Pazarlama metni — format: ${req.format}, persona: ${req.persona}`,
      variants: [],
      hashtags: req.include_hashtags ? ['#pusula', '#emlak'] : [],
      llm_cost_usd: 0,
      trace_id: req.trace_id,
    };
  }
}
