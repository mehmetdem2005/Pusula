/**
 * Pusula BullMQ kuyruk isimleri ve job payload tipleri.
 * docs/11-multi-agent-mimarisi.md §5 ile tutarlı.
 */
import { z } from 'zod';

export const Q = {
  ENRICHMENT: 'pusula.enrichment',
  TREND_DAILY: 'pusula.trend-daily',
  NOTIFICATION: 'pusula.notification',
  PARSE_TELEMETRY: 'pusula.parse-telemetry',
} as const;
export type QueueName = (typeof Q)[keyof typeof Q];

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
