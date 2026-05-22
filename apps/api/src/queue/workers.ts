/**
 * Worker fonksiyonları. apps/api ana process'inde değil, ayrı `dyno`/`container`
 * olarak çalıştırılması önerilir (Render: separate worker service).
 *
 * Burada sadece worker fonksiyon factory'leri tanımlı; lifecycle apps/api/worker.ts
 * (henüz yok — V1) entry point'ten yönetilecek.
 */
import type { Logger } from '@nestjs/common';
import { Q, ListBatchJob, EnrichmentJob, NotificationJob } from './queue.tokens.js';

interface Job<T> {
  id?: string;
  name: string;
  data: T;
  attemptsMade?: number;
}

export function listBatchWorker(logger: Logger) {
  return async (job: Job<unknown>) => {
    const parsed = ListBatchJob.parse(job.data);
    logger.log(`list-batch ingest: ${parsed.items.length} item (user=${parsed.user_id})`);
    // TODO V1: her item için INGEST + skor + scoring_results insert
    return { processed: parsed.items.length };
  };
}

export function enrichmentWorker(logger: Logger) {
  return async (job: Job<unknown>) => {
    const parsed = EnrichmentJob.parse(job.data);
    logger.log(`enrichment ${parsed.ilan_id}: steps=${parsed.steps.join(',')}`);
    // TODO V1: her step için specialist agent çağrısı
    return { ilan_id: parsed.ilan_id, completed_steps: [] };
  };
}

export function notificationWorker(logger: Logger) {
  return async (job: Job<unknown>) => {
    const parsed = NotificationJob.parse(job.data);
    logger.log(`notification user=${parsed.user_id} ilan=${parsed.ilan_id} score=${parsed.score}`);
    // TODO V1: throttle check + channel preferences + provider call
    return { delivered: false };
  };
}

export const WORKER_QUEUES = [Q.LIST_BATCH_INGEST, Q.ENRICHMENT, Q.NOTIFICATION];
