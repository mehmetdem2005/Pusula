import { z } from 'zod';

export const RiskRequest = z.object({
  enlem: z.number().optional(),
  boylam: z.number().optional(),
  insa_yili: z.number().int().optional(),
  ada: z.string().optional(),
  parsel: z.string().optional(),
  trace_id: z.string().uuid(),
});
export type RiskRequest = z.infer<typeof RiskRequest>;

export const RiskContext = z.object({
  deprem_tehlike_bandi: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).optional(),
  fay_mesafe_m: z.number().optional(),
  fay_adi: z.string().optional(),
  kentsel_donusum: z.enum(['riskli', 'donusum_bolgesi', 'normal']).optional(),
  zemin_tipi: z.string().optional(),
});
export type RiskContext = z.infer<typeof RiskContext>;

export const RiskResponse = z.object({
  context: RiskContext,
  uyarilar: z.array(z.string()),
  data_sources: z.array(z.string()),
  trace_id: z.string().uuid(),
});
export type RiskResponse = z.infer<typeof RiskResponse>;
