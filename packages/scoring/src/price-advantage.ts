import type { KonutInput, KomparableOzet, Confidence } from '@pusula/shared';
import { PRICE_SIGMOID_SLOPE, COMPARABLE_CONFIG } from '@pusula/shared';
import { clamp01_100, sigmoid, quantile, median } from './utils.js';

/**
 * Bir karşılaştırılabilir ilanın özet bilgisi (skorlama için).
 */
export interface KomparableIlan {
  id: string;
  m2: number;
  fiyat_tl: number;
  bina_yasi: number;
  oda_sayisi: string;
  mahalle?: string;
  ilce: string;
}

/**
 * Karşılaştırılabilir set'i outlier'lardan temizler (IQR × 3 üstü atılır).
 */
function removeOutliers(values: number[]): number[] {
  if (values.length < 4) return values;
  const q1 = quantile(values, 0.25);
  const q3 = quantile(values, 0.75);
  const iqr = q3 - q1;
  const lo = q1 - 3 * iqr;
  const hi = q3 + 3 * iqr;
  return values.filter((v) => v >= lo && v <= hi);
}

/**
 * Fiyat Avantajı skoru — 0-100.
 * Z-score ile sigmoid normalize. Yüksek skor = ilan benzerlerine göre ucuz.
 */
export function fiyatAvantajiSkoru(
  ilan: Pick<KonutInput, 'fiyat_tl' | 'net_m2'>,
  comparables: KomparableIlan[]
): { skor: number; ozet: KomparableOzet; confidence: Confidence } {
  const ilanM2Tl = ilan.fiyat_tl / ilan.net_m2;

  if (comparables.length < COMPARABLE_CONFIG.min_count) {
    return {
      skor: 50, // nötr — veri yok
      ozet: {
        count: comparables.length,
        ilan_m2_tl: ilanM2Tl,
        z_score: 0,
      },
      confidence: 'low',
    };
  }

  const m2Fiyatlari = removeOutliers(comparables.map((c) => c.fiyat_tl / c.m2));

  const med = median(m2Fiyatlari);
  const p25 = quantile(m2Fiyatlari, 0.25);
  const p75 = quantile(m2Fiyatlari, 0.75);
  const iqr = p75 - p25;

  if (iqr <= 0) {
    return {
      skor: 50,
      ozet: { count: m2Fiyatlari.length, median_m2_tl: med, p25_m2_tl: p25, p75_m2_tl: p75, ilan_m2_tl: ilanM2Tl, z_score: 0 },
      confidence: 'low',
    };
  }

  // ZScore pozitif = ilan medyan altında = avantaj
  const zScore = (med - ilanM2Tl) / iqr;
  const skor = clamp01_100(100 * sigmoid(zScore * PRICE_SIGMOID_SLOPE));

  const confidence: Confidence = comparables.length >= 15 ? 'high' : comparables.length >= 8 ? 'medium' : 'low';

  return {
    skor,
    ozet: {
      count: m2Fiyatlari.length,
      median_m2_tl: med,
      p25_m2_tl: p25,
      p75_m2_tl: p75,
      ilan_m2_tl: ilanM2Tl,
      z_score: zScore,
    },
    confidence,
  };
}
