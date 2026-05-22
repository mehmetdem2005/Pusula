import type { KonutInput } from '@pusula/shared';
import { clamp01_100 } from './utils.js';

/**
 * Konum context'i — external data enrichment'tan gelir.
 * MVP'de bazı alanlar opsiyonel (henüz çekilmemiş olabilir).
 */
export interface KonumContext {
  ana_caddeye_mesafe_m?: number;
  metro_metrobus_mesafe_m?: number;
  toplu_tasima_hat_sayisi?: number;
  market_mesafe_m?: number;
  okul_mesafe_m?: number;
  hastane_mesafe_m?: number;
  park_mesafe_m?: number;
  mahalle_gelir_quintile?: 1 | 2 | 3 | 4 | 5; // TÜİK quintile
  mahalle_fiyat_ivmesi_12ay_yuzde?: number;
}

function mesafeScore(mesafe: number | undefined, thresholds: [number, number, number, number]): number | null {
  if (mesafe === undefined) return null;
  const [t1, t2, t3, t4] = thresholds;
  if (mesafe < t1) return 95;
  if (mesafe < t2) return 80;
  if (mesafe < t3) return 60;
  if (mesafe < t4) return 40;
  return 25;
}

interface F { key: string; weight: number; score: number | null }

export function konumSkoru(
  _input: KonutInput,
  ctx: KonumContext
): { skor: number; breakdown: Array<{ key: string; deger: number; agirlik: number; katki: number }> } {
  const features: F[] = [
    { key: 'ana_cadde', weight: 0.15, score: mesafeScore(ctx.ana_caddeye_mesafe_m, [100, 300, 500, 1000]) },
    { key: 'metro', weight: 0.20, score: mesafeScore(ctx.metro_metrobus_mesafe_m, [500, 1000, 2000, 5000]) },
    {
      key: 'toplu_tasima_yogunluk',
      weight: 0.10,
      score: ctx.toplu_tasima_hat_sayisi === undefined ? null : Math.min(95, 40 + ctx.toplu_tasima_hat_sayisi * 10),
    },
    { key: 'market', weight: 0.10, score: mesafeScore(ctx.market_mesafe_m, [200, 500, 1000, 2000]) },
    { key: 'okul', weight: 0.10, score: mesafeScore(ctx.okul_mesafe_m, [300, 500, 1000, 2000]) },
    { key: 'hastane', weight: 0.05, score: mesafeScore(ctx.hastane_mesafe_m, [500, 1500, 3000, 5000]) },
    { key: 'park', weight: 0.05, score: ctx.park_mesafe_m === undefined ? null : ctx.park_mesafe_m < 500 ? 85 : 50 },
    {
      key: 'mahalle_gelir',
      weight: 0.15,
      score: ctx.mahalle_gelir_quintile === undefined ? null : 30 + (ctx.mahalle_gelir_quintile - 1) * 15,
    },
    {
      key: 'mahalle_fiyat_ivme',
      weight: 0.10,
      score:
        ctx.mahalle_fiyat_ivmesi_12ay_yuzde === undefined
          ? null
          : ctx.mahalle_fiyat_ivmesi_12ay_yuzde > 15
            ? 90
            : ctx.mahalle_fiyat_ivmesi_12ay_yuzde > 0
              ? 60
              : 30,
    },
  ];

  const present = features.filter((f) => f.score !== null) as Array<F & { score: number }>;
  const totalWeight = present.reduce((s, f) => s + f.weight, 0);

  if (totalWeight === 0) return { skor: 50, breakdown: [] };

  let skor = 0;
  const breakdown = present.map((f) => {
    const w = f.weight / totalWeight;
    const k = w * f.score;
    skor += k;
    return { key: f.key, deger: f.score, agirlik: w, katki: k };
  });

  return { skor: clamp01_100(skor), breakdown };
}
