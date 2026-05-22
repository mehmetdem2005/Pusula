import { z } from 'zod';
import { KonutInput, SkorSonucu } from '@pusula/shared';
import { UserPersona } from './common.js';

export const ScoringRequest = z.object({
  ilan: KonutInput,
  context_options: z.object({
    include_comparables: z.boolean().default(true),
    include_vision: z.boolean().default(false),
    include_market: z.boolean().default(true),
    persona: UserPersona.optional(),
    max_latency_ms: z.number().int().positive().default(8000),
  }),
  trace_id: z.string().uuid(),
});
export type ScoringRequest = z.infer<typeof ScoringRequest>;

export const ScoringResponse = z.object({
  result: SkorSonucu,
  pillar_durations_ms: z.record(z.number()),
  total_duration_ms: z.number(),
  trace_id: z.string().uuid(),
});
export type ScoringResponse = z.infer<typeof ScoringResponse>;
