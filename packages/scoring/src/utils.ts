/** [0, 100] aralığına clamp. */
export const clamp01_100 = (n: number): number => Math.max(0, Math.min(100, n));

/** Logistic sigmoid. */
export const sigmoid = (x: number): number => 1 / (1 + Math.exp(-x));

/**
 * Quantile (linear interpolation, q ∈ [0,1]).
 * Boş diziye karşı NaN döner — caller'da kontrol et.
 */
export function quantile(arr: number[], q: number): number {
  if (arr.length === 0) return NaN;
  const sorted = [...arr].sort((a, b) => a - b);
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  const lo = sorted[base];
  const hi = sorted[base + 1];
  if (lo === undefined) return NaN;
  if (hi === undefined) return lo;
  return lo + rest * (hi - lo);
}

export const median = (arr: number[]): number => quantile(arr, 0.5);
