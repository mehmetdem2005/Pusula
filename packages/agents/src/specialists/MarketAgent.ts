/**
 * MarketAgent — Tier 1
 * docs/11-multi-agent-mimarisi.md §4.7, docs/10-aaa-skorlama-spec.md §3.7
 */
import { z } from 'zod';
import { MarketRequest, MarketResponse } from '../contracts/market.js';
import type { Logger } from '../runtime/Logger.js';

export class MarketAgent {
  static readonly name = 'market' as const;
  static readonly inputSchema = MarketRequest;
  static readonly outputSchema = MarketResponse;

  constructor(private logger: Logger) {}

  async handle(req: z.infer<typeof MarketRequest>): Promise<z.infer<typeof MarketResponse>> {
    this.logger.info('MarketAgent.handle', { trace_id: req.trace_id });

    // TODO: Supabase aggregate queries + TCMB faiz API
    return {
      dynamics: {},
      data_freshness: new Date().toISOString(),
      trace_id: req.trace_id,
    };
  }
}
