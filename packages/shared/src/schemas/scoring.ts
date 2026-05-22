import { z } from 'zod';

export const SkorBileseni = z.object({
  ad: z.string(),
  deger: z.number().min(0).max(100),
  agirlik: z.number().min(0).max(1),
  katki: z.number(), // weight * value
  aciklama: z.string().optional(),
});
export type SkorBileseni = z.infer<typeof SkorBileseni>;

export const Confidence = z.enum(['high', 'medium', 'low']);
export type Confidence = z.infer<typeof Confidence>;

export const SkorEtiketi = z.enum([
  'kacirilmaz',
  'kelepir',
  'iyi_fiyat',
  'piyasa',
  'pahali',
  'asiri_pahali',
]);
export type SkorEtiketi = z.infer<typeof SkorEtiketi>;

export const KomparableOzet = z.object({
  count: z.number().int().min(0),
  median_m2_tl: z.number().positive().optional(),
  p25_m2_tl: z.number().positive().optional(),
  p75_m2_tl: z.number().positive().optional(),
  ilan_m2_tl: z.number().positive(),
  z_score: z.number(),
});
export type KomparableOzet = z.infer<typeof KomparableOzet>;

export const SkorSonucu = z.object({
  toplam: z.number().min(0).max(100),
  etiket: SkorEtiketi,
  bilesenler: z.object({
    fiyat_avantaji: SkorBileseni,
    kalite: SkorBileseni,
    konum: SkorBileseni,
    risk: SkorBileseni,
  }),
  alt_bilesenler: z.record(z.object({
    deger: z.number(),
    agirlik: z.number(),
  })),
  comparable: KomparableOzet,
  confidence: Confidence,
  uyarilar: z.array(z.string()),
  hesap_zamani: z.string().datetime(),
  formul_versiyonu: z.string(), // "v0.1"
});
export type SkorSonucu = z.infer<typeof SkorSonucu>;
