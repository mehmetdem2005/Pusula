import type { SkorEtiketi } from '@pusula/shared';
import { SCORE_BANDS } from '@pusula/shared';

/**
 * Bir skor için etiket döner.
 *
 * Bantlar `min` değerine göre büyükten küçüğe sıralıdır; ilk `skor >= band.min`
 * eşleşmesi seçilir. Bu sayede 84.5 gibi ondalık değerlerde de doğru etiket
 * üretilir (eski max/min kapalı aralık tanımı band aralarında boşluk
 * yaratıyordu — bug fix).
 */
export function skorEtiketi(skor: number): SkorEtiketi {
  for (const band of SCORE_BANDS) {
    if (skor >= band.min) return band.etiket;
  }
  return 'asiri_pahali';
}
