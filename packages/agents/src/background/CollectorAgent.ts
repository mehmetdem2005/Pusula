/**
 * CollectorAgent — Tier 2
 * docs/11-multi-agent-mimarisi.md §5.1
 *
 * Cron-driven: izinli kaynaklardan ilan toplama, mahalle verisi refresh.
 * BullMQ ile çalışır, idempotent.
 */
import type { Logger } from '../runtime/Logger.js';

export interface CollectorJob {
  source: 'hepsiemlak' | 'emlakjet' | 'zingat' | 'tuik' | 'tcmb';
  url_or_query: string;
  trace_id: string;
}

export class CollectorAgent {
  static readonly name = 'collector' as const;

  constructor(private logger: Logger) {}

  async process(job: CollectorJob): Promise<{ items_collected: number }> {
    this.logger.info('CollectorAgent.process', { source: job.source, trace_id: job.trace_id });
    // TODO: source'a göre fetch + parse + DB upsert
    return { items_collected: 0 };
  }
}
