/**
 * RiskAgent — Tier 1
 * docs/11-multi-agent-mimarisi.md §4.4
 */
import type { z } from 'zod';
import { RiskRequest, RiskResponse } from '../contracts/risk.js';
import type { Logger } from '../runtime/Logger.js';

export class RiskAgent {
  static readonly name = 'risk' as const;
  static readonly inputSchema = RiskRequest;
  static readonly outputSchema = RiskResponse;

  constructor(private logger: Logger) {}

  async handle(req: z.infer<typeof RiskRequest>): Promise<z.infer<typeof RiskResponse>> {
    this.logger.info('RiskAgent.handle', { trace_id: req.trace_id });

    // TODO: AFAD koordinat lookup + MTA fay mesafesi + kentsel dönüşüm GIS
    return {
      context: {},
      uyarilar: [],
      data_sources: ['stub'],
      trace_id: req.trace_id,
    };
  }
}
