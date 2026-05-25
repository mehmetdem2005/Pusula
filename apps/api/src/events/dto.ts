import { z } from 'zod';

export const EventSchema = z.object({
  listing_id: z.string().uuid(),
  event_type: z.enum(['view', 'dwell', 'like', 'unlike', 'rewatch', 'save', 'skip', 'share']),
  dwell_ms: z.number().int().min(0).max(3_600_000).optional(),
  position: z.number().int().min(0).max(100_000).optional(),
});

export const EventsBatchSchema = z.object({
  events: z.array(EventSchema).min(1).max(100),
});
export type EventsBatchInput = z.infer<typeof EventsBatchSchema>;
