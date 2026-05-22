import { describe, it, expect } from 'vitest';
import { kelepirSkoru, InvalidWeightsError } from '../src/scoring-engine.js';
import type { KonutInput } from '@pusula/shared';

const baseIlan: KonutInput = {
  kaynak: 'sahibinden',
  kaynak_id: '1',
  ilan_url: 'https://www.sahibinden.com/ilan/1',
  baslik: 'Test ilanı',
  fiyat_tl: 4_750_000,
  il: 'İstanbul',
  ilce: 'Beşiktaş',
  net_m2: 95,
  oda_sayisi: '2+1',
  bina_yasi: 12,
  isitma: 'dogalgaz_kombi',
  parse_versiyonu: 'test',
  parse_tarihi: new Date().toISOString(),
  foto_urlleri: [],
};

describe('ScoringOptions.weights', () => {
  it('custom weights kabul edilir (toplam=1)', () => {
    const result = kelepirSkoru(
      baseIlan,
      { comparables: [], konum: {}, risk: {} },
      { weights: { fiyat_avantaji: 0.6, kalite: 0.2, konum: 0.1, risk: 0.1 } },
    );
    expect(result.bilesenler.fiyat_avantaji.agirlik).toBe(0.6);
  });

  it('toplam 1 değilse InvalidWeightsError', () => {
    expect(() =>
      kelepirSkoru(
        baseIlan,
        { comparables: [], konum: {}, risk: {} },
        { weights: { fiyat_avantaji: 0.5, kalite: 0.5, konum: 0.5, risk: 0.5 } },
      ),
    ).toThrow(InvalidWeightsError);
  });

  it('0.001 toleransı içinde kabul', () => {
    expect(() =>
      kelepirSkoru(
        baseIlan,
        { comparables: [], konum: {}, risk: {} },
        { weights: { fiyat_avantaji: 0.4501, kalite: 0.2499, konum: 0.2, risk: 0.1 } },
      ),
    ).not.toThrow();
  });
});
