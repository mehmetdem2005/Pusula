import { describe, it, expect } from 'vitest';
import { skorEtiketi } from '../src/labels.js';

describe('skorEtiketi — band sınırları', () => {
  it.each([
    [100, 'kacirilmaz'],
    [90, 'kacirilmaz'],
    [85, 'kacirilmaz'],
    [84.99, 'kelepir'],
    [84.5, 'kelepir'], // ← Bug fix: önceki versiyonda 'piyasa' fallback'e düşüyordu
    [70, 'kelepir'],
    [69.99, 'iyi_fiyat'],
    [60, 'iyi_fiyat'],
    [55, 'iyi_fiyat'],
    [54.5, 'piyasa'],
    [40, 'piyasa'],
    [39.99, 'pahali'],
    [25, 'pahali'],
    [24.99, 'asiri_pahali'],
    [10, 'asiri_pahali'],
    [0, 'asiri_pahali'],
  ])('skor %d → %s', (skor, beklenen) => {
    expect(skorEtiketi(skor)).toBe(beklenen);
  });

  it('negatif değerler → asiri_pahali', () => {
    expect(skorEtiketi(-1)).toBe('asiri_pahali');
  });

  it('NaN → asiri_pahali (fallback)', () => {
    expect(skorEtiketi(NaN)).toBe('asiri_pahali');
  });
});
