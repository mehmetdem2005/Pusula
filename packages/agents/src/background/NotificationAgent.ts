/**
 * NotificationAgent — Tier 2
 * docs/11-multi-agent-mimarisi.md §5.4
 *
 * Event-driven: yeni ilan skoru ≥ 75 + kullanıcı kayıtlı filtre eşleşmesi → push.
 * Throttle: per user 5/saat, 20/gün.
 */
import type { Logger } from '../runtime/Logger.js';

export interface NotificationJob {
  user_id: string;
  ilan_id: string;
  score: number;
  filter_id: string;
  trace_id: string;
}

export class NotificationAgent {
  static readonly name = 'notification' as const;

  constructor(private logger: Logger) {}

  async process(job: NotificationJob): Promise<{ delivered: boolean; channels: string[] }> {
    this.logger.info('NotificationAgent.process', {
      user_id: job.user_id,
      ilan_id: job.ilan_id,
      score: job.score,
      trace_id: job.trace_id,
    });

    // TODO:
    // 1. Throttle check (Redis counter per user)
    // 2. Channel preferences (push, email, WhatsApp Business V2+)
    // 3. Send via provider
    // 4. Audit log

    return { delivered: false, channels: [] };
  }
}
