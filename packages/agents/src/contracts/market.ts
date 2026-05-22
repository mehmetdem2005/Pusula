import { z } from 'zod';

export const MarketRequest = z.object({
  ilan_id: z.string().uuid().optional(),
  mahalle: z.string(),
  ilce: z.string(),
  net_m2: z.number().int().positive().optional(),
  oda_sayisi: z.string().optional(),
  trace_id: z.string().uuid(),
});
export type MarketRequest = z.infer<typeof MarketRequest>;

export const MarketDynamics = z.object({
  dom_days: z.number().int().optional(),
  price_drops_count: z.number().int().optional(),
  total_discount_pct: z.number().optional(),
  mahalle_30d_change_pct: z.number().optional(),
  mahalle_90d_change_pct: z.number().optional(),
  mahalle_stock_delta_30d: z.number().optional(),
  seasonality_coefficient: z.number().optional(),
  tcmb_policy_rate: z.number().optional(),
  view_count_proxy: z.number().int().optional(),
  liquidity_score: z.number().min(0).max(100).optional(),
});
export type MarketDynamics = z.infer<typeof MarketDynamics>;

export const MarketResponse = z.object({
  dynamics: MarketDynamics,
  data_freshness: z.string().datetime(),
  trace_id: z.string().uuid(),
});
export type MarketResponse = z.infer<typeof MarketResponse>;
