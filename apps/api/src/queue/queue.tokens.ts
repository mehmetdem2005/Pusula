/**
 * Pusula BullMQ kuyruk isimleri ve job payload tipleri.
 * docs/11-multi-agent-mimarisi.md §5 ile tutarlı.
 */
import { z } from 'zod';

export const Q = {
  LIST_BATCH_INGEST: 'pusula.list-batch-ingest',
  ENRICHMENT: 'pusula.enrichment',
  TREND_DAILY: 'pusula.trend-daily',
  NOTIFICATION: 'pusula.notification',
  PARSE_TELEMETRY: 'pusula.parse-telemetry',
  VIDEO_GENERATE: 'pusula.video-generate',
} as const;
export type QueueName = (typeof Q)[keyof typeof Q];

/** Liste batch ingest (passive collector / eklenti) — URL'leri queue'ya at. */
export const ListBatchJob = z.object({
  user_id: z.string().uuid(),
  items: z
    .array(
      z.object({
        url: z.string().url(),
        baslik: z.string(),
        fiyat: z.string(),
      }),
    )
    .min(1)
    .max(200),
  trace_id: z.string().uuid(),
});
export type ListBatchJob = z.infer<typeof ListBatchJob>;

/** AI video üretimi (Faz 3). Worker: provider.start→poll→media; mock anında tamamlar. */
export const VideoGenerateJob = z.object({
  job_id: z.string().uuid(),
  trace_id: z.string().uuid().optional(),
});
export type VideoGenerateJob = z.infer<typeof VideoGenerateJob>;

export const EnrichmentJob = z.object({
  ilan_id: z.string().uuid(),
  steps: z.array(z.enum(['comparable', 'location', 'risk', 'vision', 'nlp', 'market'])).min(1),
  trace_id: z.string().uuid(),
});
export type EnrichmentJob = z.infer<typeof EnrichmentJob>;

export const NotificationJob = z.object({
  user_id: z.string().uuid(),
  ilan_id: z.string().uuid(),
  score: z.number(),
  filter_id: z.string(),
  trace_id: z.string().uuid(),
});
export type NotificationJob = z.infer<typeof NotificationJob>;
