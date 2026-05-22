/**
 * TrendAgent — Tier 2
 * docs/11-multi-agent-mimarisi.md §5.3
 *
 * Cron (her gün 03:00): mahalle bazlı 30/60/90/180 gün fiyat trendi + anomaly drift detection.
 */
import type { Logger } from '../runtime/Logger.js';

export class TrendAgent {
  static readonly name = 'trend' as const;

  constructor(private logger: Logger) {}

  async runDaily(): Promise<{ mahalleler_processed: number; drift_alerts: number }> {
    this.logger.info('TrendAgent.runDaily start');
    // TODO: tüm mahalleler için aggregate query + KS test ile drift detection
    return { mahalleler_processed: 0, drift_alerts: 0 };
  }
}
