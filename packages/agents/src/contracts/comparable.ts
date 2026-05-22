import { z } from 'zod';

export const ComparableRequest = z.object({
  ilan_id: z.string().uuid(),
  k: z.number().int().min(1).max(50).default(20),
  strategy: z.enum(['narrow', 'hybrid', 'broad']).default('hybrid'),
  trace_id: z.string().uuid(),
});
export type ComparableRequest = z.infer<typeof ComparableRequest>;

export const ComparableItem = z.object({
  id: z.string().uuid(),
  ilan_url: z.string().url(),
  baslik: z.string(),
  fiyat_tl: z.number().int().positive(),
  m2: z.number().int().positive(),
  fiyat_per_m2: z.number().positive(),
  bina_yasi: z.number().int().min(0),
  oda_sayisi: z.string(),
  mahalle: z.string().optional(),
  ilce: z.string(),
  similarity_score: z.number().min(0).max(1),
  distance_meters: z.number().optional(),
});
export type ComparableItem = z.infer<typeof ComparableItem>;

export const ComparableResponse = z.object({
  items: z.array(ComparableItem),
  total_count: z.number().int().min(0),
  strategy_used: z.enum(['narrow', 'hybrid', 'broad']),
  duration_ms: z.number(),
  trace_id: z.string().uuid(),
});
export type ComparableResponse = z.infer<typeof ComparableResponse>;
