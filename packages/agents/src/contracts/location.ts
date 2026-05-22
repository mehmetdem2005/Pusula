import { z } from 'zod';

export const LocationRequest = z.object({
  il: z.string(),
  ilce: z.string(),
  mahalle: z.string().optional(),
  enlem: z.number().optional(),
  boylam: z.number().optional(),
  trace_id: z.string().uuid(),
});
export type LocationRequest = z.infer<typeof LocationRequest>;

export const LocationContext = z.object({
  ana_caddeye_mesafe_m: z.number().optional(),
  metro_metrobus_mesafe_m: z.number().optional(),
  toplu_tasima_hat_sayisi: z.number().int().optional(),
  market_mesafe_m: z.number().optional(),
  okul_mesafe_m: z.number().optional(),
  hastane_mesafe_m: z.number().optional(),
  park_mesafe_m: z.number().optional(),
  mahalle_gelir_quintile: z
    .union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)])
    .optional(),
  mahalle_fiyat_ivmesi_12ay_yuzde: z.number().optional(),
  gentrifikasyon_momentum: z.number().optional(),
  data_freshness: z.string().datetime().optional(),
});
export type LocationContext = z.infer<typeof LocationContext>;

export const LocationResponse = z.object({
  context: LocationContext,
  fallbacks_used: z.array(z.string()),
  confidence: z.number().min(0).max(100),
  trace_id: z.string().uuid(),
});
export type LocationResponse = z.infer<typeof LocationResponse>;
