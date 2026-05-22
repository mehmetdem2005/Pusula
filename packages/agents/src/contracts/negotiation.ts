import { z } from 'zod';

export const NegotiationRequest = z.object({
  ilan_id: z.string().uuid(),
  scoring_summary: z.unknown(),       // SkorSonucu — opaque burada
  market_dynamics: z.unknown().optional(),
  nlp_result: z.unknown().optional(),
  trace_id: z.string().uuid(),
});
export type NegotiationRequest = z.infer<typeof NegotiationRequest>;

export const NegotiationOutput = z.object({
  marj_tahmini_yuzde: z.object({
    min: z.number(),
    likely: z.number(),
    max: z.number(),
  }),
  taktik: z.enum(['agresif', 'orta', 'temkinli']),
  taktik_gerekce: z.string(),
  ipuclari: z.array(z.string()),
  musteri_mesaj_draft: z.string(),
  red_flags: z.array(z.string()),
});
export type NegotiationOutput = z.infer<typeof NegotiationOutput>;

export const NegotiationResponse = z.object({
  result: NegotiationOutput,
  llm_cost_usd: z.number(),
  trace_id: z.string().uuid(),
});
export type NegotiationResponse = z.infer<typeof NegotiationResponse>;
