/**
 * Sabitler — bütün uygulama paylaşır.
 */

export const APP_NAME = 'Pusula';
export const APP_VERSION = '0.0.1';

/** Skor formül versiyonu. Format değişikliğinde bump et. */
export const SCORING_FORMULA_VERSION = 'v0.1';

/** Ana ağırlıklar — kullanıcı override edebilir. */
export interface ScoreWeights {
  fiyat_avantaji: number;
  kalite: number;
  konum: number;
  risk: number;
}

export const DEFAULT_SCORE_WEIGHTS: ScoreWeights = {
  fiyat_avantaji: 0.45,
  kalite: 0.25,
  konum: 0.2,
  risk: 0.1,
};

/** Comparable set seçim parametreleri. */
export const COMPARABLE_CONFIG = {
  min_count: 5,
  m2_tolerance: 0.2,
  yas_tolerance_yil: 5,
  zaman_penceresi_gun: 90,
} as const;

/** Sigmoid eğim — fiyat avantajı skoru için. */
export const PRICE_SIGMOID_SLOPE = 1.5;

/**
 * Skor etiket bantları — alt sınır dahil, üst sınır bir sonraki band'ın min'i.
 * `labels.ts` ilk eşleşen band'ı seçer (büyükten küçüğe sıralı).
 *
 * 84.5 gibi ondalık skorlar artık `kelepir` olarak etiketlenir (önceki sürümde
 * `piyasa` fallback'e düşüyordu — bug fix).
 */
export const SCORE_BANDS = [
  { min: 85, etiket: 'kacirilmaz' as const },
  { min: 70, etiket: 'kelepir' as const },
  { min: 55, etiket: 'iyi_fiyat' as const },
  { min: 40, etiket: 'piyasa' as const },
  { min: 25, etiket: 'pahali' as const },
  { min: 0, etiket: 'asiri_pahali' as const },
] as const;

/** Türk Lirası para birimi formatı için locale. */
export const TR_LOCALE = 'tr-TR';
export const TR_CURRENCY = 'TRY';

/** Backend API base URL — env'den override edilebilir. */
export const DEFAULT_API_BASE = 'https://api.pusula.tr';

/** Allowed sahibinden hostnames (extension manifest için). */
export const SUPPORTED_HOSTS = ['www.sahibinden.com', 'sahibinden.com'] as const;
