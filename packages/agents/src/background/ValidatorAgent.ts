/**
 * ValidatorAgent — Tier 2
 * docs/11-multi-agent-mimarisi.md §5.2
 *
 * Event-driven: yeni ilan ingest edildi → schema validate + duplicate check + DOM parse integrity.
 */
import type { Logger } from '../runtime/Logger.js';

export interface ValidatorJob {
  ilan_id: string;
  trace_id: string;
}

export class ValidatorAgent {
  static readonly name = 'validator' as const;

  constructor(private logger: Logger) {}

  async process(job: ValidatorJob): Promise<{ flags: string[] }> {
    this.logger.info('ValidatorAgent.process', { ilan_id: job.ilan_id, trace_id: job.trace_id });
    // TODO: data_quality_flags hesapla, DB'ye yaz
    return { flags: [] };
  }
}
