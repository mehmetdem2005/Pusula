/**
 * LocationAgent — Tier 1
 * docs/11-multi-agent-mimarisi.md §4.3
 */
import { z } from 'zod';
import { LocationRequest, LocationResponse } from '../contracts/location.js';
import type { Logger } from '../runtime/Logger.js';

export class LocationAgent {
  static readonly name = 'location' as const;
  static readonly inputSchema = LocationRequest;
  static readonly outputSchema = LocationResponse;

  constructor(private logger: Logger) {}

  async handle(req: z.infer<typeof LocationRequest>): Promise<z.infer<typeof LocationResponse>> {
    this.logger.info('LocationAgent.handle', { trace_id: req.trace_id });

    // TODO: OSM Overpass + TÜİK + MEB tool worker'ları çağır
    return {
      context: {},
      fallbacks_used: ['stub'],
      confidence: 0,
      trace_id: req.trace_id,
    };
  }
}
