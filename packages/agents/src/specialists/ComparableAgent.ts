/**
 * ComparableAgent — Tier 1
 * docs/11-multi-agent-mimarisi.md §4.2
 */
import { z } from 'zod';
import { ComparableRequest, ComparableResponse } from '../contracts/comparable.js';
import type { Logger } from '../runtime/Logger.js';

export class ComparableAgent {
  static readonly name = 'comparable' as const;
  static readonly inputSchema = ComparableRequest;
  static readonly outputSchema = ComparableResponse;

  constructor(private logger: Logger) {}

  async handle(req: z.infer<typeof ComparableRequest>): Promise<z.infer<typeof ComparableResponse>> {
    this.logger.info('ComparableAgent.handle', { trace_id: req.trace_id });
    const start = Date.now();

    // TODO: Supabase'den filtreli sorgu + embedding kNN reranker (V1)
    return {
      items: [],
      total_count: 0,
      strategy_used: req.strategy,
      duration_ms: Date.now() - start,
      trace_id: req.trace_id,
    };
  }
}
