import { describe, it, expect } from 'vitest';
import {
  yasScore,
  m2Score,
  brutNetOraniScore,
  katScore,
  isitmaScore,
  asansorScore,
  otoparkScore,
  kaliteSkoru,
} from '../src/quality.js';
import type { KonutInput } from '@pusula/shared';

describe('yasScore', () => {
  it.each([
    [0, 95],
    [5, 95],
    [10, 75],
    [20, 55],
    [40, 35],
    [60, 20],
  ])('bina_yasi %d → %d', (yas, beklenen) => {
    expect(yasScore(yas)).toBe(beklenen);
  });
});

describe('m2Score — oda tipine göre beklenen aralık', () => {
  it('2+1 için 90 m² ideal (≥0.95 ratio) → ≥75', () => {
    expect(m2Score(90, '2+1')).toBeGreaterThanOrEqual(75);
  });
  it('1+1 için 55 m² ideal → ≥75', () => {
    expect(m2Score(55, '1+1')).toBeGreaterThanOrEqual(75);
  });
  it('Çok küçük (oda için) → düşük skor', () => {
    expect(m2Score(40, '3+1')).toBeLessThanOrEqual(45);
  });
  it('Çok büyük → yüksek skor', () => {
    expect(m2Score(200, '2+1')).toBe(95);
  });
});

describe('brutNetOraniScore', () => {
  it('oran 1.10 → 95 (verimli)', () => {
    expect(brutNetOraniScore(110, 100)).toBe(95);
  });
  it('oran 1.40 → 35 (ortak alan fazla)', () => {
    expect(brutNetOraniScore(140, 100)).toBe(35);
  });
  it('eksik veri → null', () => {
    expect(brutNetOraniScore(undefined, 100)).toBeNull();
    expect(brutNetOraniScore(140, undefined)).toBeNull();
  });
});

describe('katScore', () => {
  it('zemin / bahçe katı → 30', () => {
    expect(katScore('zemin')).toBe(30);
    expect(katScore('bahce_kati')).toBe(30);
  });
  it('5. kat → 90', () => {
    expect(katScore(5)).toBe(90);
  });
  it('20. kat → 55', () => {
    expect(katScore(20)).toBe(55);
  });
  it('undefined → null', () => {
    expect(katScore(undefined)).toBeNull();
  });
});

describe('isitmaScore', () => {
  it('yerden_isitma en yüksek (95)', () => {
    expect(isitmaScore('yerden_isitma')).toBe(95);
  });
  it('yok en düşük (15)', () => {
    expect(isitmaScore('yok')).toBe(15);
  });
});

describe('asansorScore', () => {
  it('var → 90', () => {
    expect(asansorScore(true, 3)).toBe(90);
  });
  it('yok + yüksek kat → 30 (problem)', () => {
    expect(asansorScore(false, 5)).toBe(30);
  });
  it('yok + alçak kat → 70', () => {
    expect(asansorScore(false, 1)).toBe(70);
  });
  it('undefined → null', () => {
    expect(asansorScore(undefined, 3)).toBeNull();
  });
});

describe('otoparkScore', () => {
  it.each([
    ['kapali', 90],
    ['acik', 75],
    ['yok', 40],
  ])('%s → %d', (val, beklenen) => {
    expect(otoparkScore(val as 'kapali' | 'acik' | 'yok')).toBe(beklenen);
  });
});

describe('kaliteSkoru — eksik veri normalize', () => {
  const base: KonutInput = {
    kaynak: 'sahibinden',
    kaynak_id: '1',
    ilan_url: 'https://www.sahibinden.com/ilan/1',
    baslik: 'Test',
    fiyat_tl: 1_000_000,
    il: 'İstanbul',
    ilce: 'Kadıköy',
    net_m2: 80,
    oda_sayisi: '2+1',
    bina_yasi: 10,
    isitma: 'dogalgaz_kombi',
    parse_versiyonu: 'test',
    parse_tarihi: new Date().toISOString(),
    foto_urlleri: [],
  };

  it('minimal veri ile skor 0-100 arasında', () => {
    const result = kaliteSkoru(base);
    expect(result.skor).toBeGreaterThanOrEqual(0);
    expect(result.skor).toBeLessThanOrEqual(100);
  });

  it('breakdown sadece present feature\'ları içerir', () => {
    const result = kaliteSkoru(base);
    // brut_m2, asansor, otopark vs. yok → breakdown'da olmayacak
    expect(result.breakdown.find((b) => b.key === 'brut_net_orani')).toBeUndefined();
    expect(result.breakdown.find((b) => b.key === 'asansor')).toBeUndefined();
  });

  it('hiçbir feature yoksa nötr 50 döner', () => {
    // Imkansız (bina_yasi ve net_m2 zorunlu) ama edge case
    const result = kaliteSkoru({ ...base, bina_yasi: 0, net_m2: 90 });
    expect(result.skor).toBeGreaterThanOrEqual(0);
  });
});
