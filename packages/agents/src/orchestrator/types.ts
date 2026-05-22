/**
 * Pusula Brain (Orchestrator) tipleri.
 * docs/11-multi-agent-mimarisi.md §3'e uygun.
 */
import { z } from 'zod';
import { UserPersona, IntentClass, AgentName } from '../contracts/common.js';

export const ChatAttachment = z.object({
  type: z.enum(['image', 'url', 'file']),
  ref: z.string(),
});

export const BrainInput = z.object({
  user_id: z.string().uuid(),
  thread_id: z.string().uuid(),
  message: z.string().min(1).max(8000),
  attachments: z.array(ChatAttachment).optional(),
  active_ilan_id: z.string().uuid().optional(),
  persona: UserPersona.optional(),
  preferred_locale: z.literal('tr').default('tr'),
});
export type BrainInput = z.infer<typeof BrainInput>;

export const RichComponent = z.discriminatedUnion('type', [
  z.object({ type: z.literal('score_card'), ilan_id: z.string().uuid(), show_breakdown: z.boolean() }),
  z.object({ type: z.literal('comparison_table'), ilan_ids: z.array(z.string().uuid()) }),
  z.object({ type: z.literal('price_timeline'), mahalle: z.string() }),
  z.object({ type: z.literal('map_preview'), enlem: z.number(), boylam: z.number() }),
  z.object({ type: z.literal('financial_simulator'), ilan_id: z.string().uuid() }),
  z.object({ type: z.literal('marketing_draft'), variants: z.array(z.string()) }),
]);
export type RichComponent = z.infer<typeof RichComponent>;

export const BrainOutput = z.object({
  thread_id: z.string().uuid(),
  reply: z.object({
    text: z.string(),
    rich_components: z.array(RichComponent).optional(),
  }),
  metadata: z.object({
    intent: IntentClass,
    persona: UserPersona,
    agents_invoked: z.array(AgentName),
    total_latency_ms: z.number(),
    cost_usd: z.number(),
    cache_hits: z.number(),
    trace_id: z.string().uuid(),
  }),
  next_suggestions: z.array(z.string()).optional(),
});
export type BrainOutput = z.infer<typeof BrainOutput>;
