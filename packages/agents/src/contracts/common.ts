/**
 * Ortak kontratlar — tüm agent'lar bu meta alanları taşır.
 * Detay: docs/11-multi-agent-mimarisi.md §7.2
 */
import { z } from 'zod';

export const AgentTier = z.enum(['tier0', 'tier1', 'tier2', 'tier3']);
export type AgentTier = z.infer<typeof AgentTier>;

export const AgentName = z.enum([
  'orchestrator',
  'scoring',
  'comparable',
  'location',
  'risk',
  'vision',
  'nlp',
  'market',
  'negotiation',
  'marketing',
  'collector',
  'validator',
  'trend',
  'notification',
]);
export type AgentName = z.infer<typeof AgentName>;

export const UserPersona = z.enum(['buyer', 'agent_seller', 'investor', 'researcher']);
export type UserPersona = z.infer<typeof UserPersona>;

export const IntentClass = z.enum([
  'persona.buyer',
  'persona.seller',
  'persona.investor',
  'persona.researcher',
  'persona.unsure',
  'task.analyze_listing',
  'task.compare_listings',
  'task.market_research',
  'task.negotiation_advice',
  'task.create_marketing',
  'task.refine_listing',
  'task.set_alert',
  'task.match_customer',
  'task.financial_simulation',
  'meta.help',
  'meta.change_persona',
  'meta.reset',
  'meta.farewell',
  'meta.feedback',
  'unknown',
]);
export type IntentClass = z.infer<typeof IntentClass>;

/**
 * Tüm inter-agent mesajları bu meta alanları taşır.
 * Distributed tracing + audit log için zorunlu.
 */
export const AgentMessageMeta = z.object({
  trace_id: z.string().uuid(),
  span_id: z.string(),
  parent_span_id: z.string().optional(),
  user_id: z.string().uuid(),
  session_id: z.string(),
  thread_id: z.string().optional(),
  timestamp: z.string().datetime(),
  source_agent: AgentName,
  target_agent: AgentName,
  message_id: z.string().uuid(),
  retry_count: z.number().int().min(0).default(0),
});
export type AgentMessageMeta = z.infer<typeof AgentMessageMeta>;

export const AgentMessage = <TBody extends z.ZodTypeAny>(bodySchema: TBody) =>
  z.object({
    meta: AgentMessageMeta,
    schema_version: z.string(),
    body: bodySchema,
  });

/** Agent çağrılarının sonucu — başarı veya kategorik hata. */
export const AgentResult = <TOk extends z.ZodTypeAny>(okSchema: TOk) =>
  z.discriminatedUnion('status', [
    z.object({
      status: z.literal('ok'),
      result: okSchema,
      duration_ms: z.number().int().min(0),
      cost_usd: z.number().min(0).default(0),
    }),
    z.object({
      status: z.literal('error'),
      error_kind: z.enum(['timeout', 'rate_limit', 'auth', 'content', 'network', 'server', 'unknown']),
      error_message: z.string(),
      retryable: z.boolean(),
      duration_ms: z.number().int().min(0),
    }),
    z.object({
      status: z.literal('degraded'),
      partial_result: okSchema.optional(),
      warnings: z.array(z.string()),
      duration_ms: z.number().int().min(0),
    }),
  ]);
