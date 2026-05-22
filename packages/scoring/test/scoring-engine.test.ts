import { describe, it, expect } from 'vitest';
import { kelepirSkoru } from '../src/scoring-engine.js';
import type { KomparableIlan } from '../src/price-advantage.js';
import type { KonutInput } from '@pusula/shared';

const baseIlan: KonutInput = {
  kaynak: 'sahibinden',
  kaynak_id: '12345',
  ilan_url: 'https://www.sahibinden.com/ilan/12345',
  baslik: 'Test ilanı',
  fiyat_tl: 4_750_000,
  il: 'İstanbul',
  ilce: 'Beşiktaş',
  mahalle: 'Sinanpaşa',
  net_m2: 95,
  brut_m2: 105,
  oda_sayisi: '2+1',
  banyo_sayisi: 1,
  bina_yasi: 12,
  bulundugu_kat: 3,
  isitma: 'dogalgaz_kombi',
  asansor: true,
  otopark: 'kapali',
  site_icinde: true,
  parse_versiyonu: 'sahibinden-v3.2',
  parse_tarihi: new Date().toISOString(),
  foto_urlleri: [],
};

function makeComparables(meanM2Tl: number, count = 20, jitter = 0.1): KomparableIlan[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `comp-${i}`,
    m2: 90 + Math.floor(Math.random() * 15),
    fiyat_tl: Math.round(
      meanM2Tl * (90 + Math.floor(Math.random() * 15)) * (1 + (Math.random() - 0.5) * jitter),
    ),
    bina_yasi: 10 + Math.floor(Math.random() * 6),
    oda_sayisi: '2+1',
    mahalle: 'Sinanpaşa',
    ilce: 'Beşiktaş',
  }));
}

describe('kelepirSkoru', () => {
  it('Medyanda fiyat → FiyatAvantajı ≈ 50', () => {
    // İlan: 95 m² × 50.000 TL = 4.750.000 TL (medyan ile aynı)
    const ctx = {
      comparables: makeComparables(50_000, 20, 0.05),
      konum: {},
      risk: { deprem_tehlike_bandi: 3 as const },
    };
    const result = kelepirSkoru(baseIlan, ctx);
    expect(result.bilesenler.fiyat_avantaji.deger).toBeGreaterThan(35);
    expect(result.bilesenler.fiyat_avantaji.deger).toBeLessThan(65);
  });

  it('%20 medyan altı → FiyatAvantajı ≥ 70', () => {
    const ucuzIlan = { ...baseIlan, fiyat_tl: Math.round(95 * 40_000) };
    const ctx = {
      comparables: makeComparables(50_000, 20, 0.05),
      konum: {},
      risk: { deprem_tehlike_bandi: 3 as const },
    };
    const result = kelepirSkoru(ucuzIlan, ctx);
    expect(result.bilesenler.fiyat_avantaji.deger).toBeGreaterThanOrEqual(70);
  });

  it('%20 medyan üstü → FiyatAvantajı ≤ 30', () => {
    const pahaliIlan = { ...baseIlan, fiyat_tl: Math.round(95 * 60_000) };
    const ctx = {
      comparables: makeComparables(50_000, 20, 0.05),
      konum: {},
      risk: { deprem_tehlike_bandi: 3 as const },
    };
    const result = kelepirSkoru(pahaliIlan, ctx);
    expect(result.bilesenler.fiyat_avantaji.deger).toBeLessThanOrEqual(30);
  });

  it('Az comparable (<5) → confidence: low + nötr fiyat', () => {
    const ctx = {
      comparables: makeComparables(50_000, 3, 0.05),
      konum: {},
      risk: {},
    };
    const result = kelepirSkoru(baseIlan, ctx);
    expect(result.confidence).toBe('low');
    expect(result.bilesenler.fiyat_avantaji.deger).toBe(50);
  });

  it('Yüksek deprem riski + 1999 öncesi bina → uyarı + ceza', () => {
    const eskiIlan = { ...baseIlan, bina_yasi: 32 };
    const ctx = {
      comparables: makeComparables(50_000, 15, 0.05),
      konum: {},
      risk: { deprem_tehlike_bandi: 1 as const, insa_yili: 1994, fay_mesafe_m: 300 },
    };
    const result = kelepirSkoru(eskiIlan, ctx);
    expect(result.uyarilar.some((u) => /deprem/i.test(u))).toBe(true);
  });

  it('Skor 0-100 aralığında', () => {
    const ctx = {
      comparables: makeComparables(50_000, 15, 0.05),
      konum: { metro_metrobus_mesafe_m: 600, mahalle_gelir_quintile: 4 as const },
      risk: { deprem_tehlike_bandi: 3 as const, insa_yili: 2020 },
    };
    const result = kelepirSkoru(baseIlan, ctx);
    expect(result.toplam).toBeGreaterThanOrEqual(0);
    expect(result.toplam).toBeLessThanOrEqual(100);
  });

  it('Etiket bantları doğru', () => {
    const ctx = {
      comparables: makeComparables(50_000, 15, 0.05),
      konum: { metro_metrobus_mesafe_m: 400, mahalle_gelir_quintile: 5 as const },
      risk: { deprem_tehlike_bandi: 4 as const, insa_yili: 2022 },
    };
    const ucuzIlan = { ...baseIlan, fiyat_tl: Math.round(95 * 35_000) };
    const result = kelepirSkoru(ucuzIlan, ctx);
    expect(['kacirilmaz', 'kelepir', 'iyi_fiyat']).toContain(result.etiket);
  });

  it('Determinizm — aynı input + aynı comparable → aynı çıktı', () => {
    const fixedComparables: KomparableIlan[] = Array.from({ length: 10 }, (_, i) => ({
      id: `c${i}`,
      m2: 95,
      fiyat_tl: 4_750_000,
      bina_yasi: 12,
      oda_sayisi: '2+1',
      ilce: 'Beşiktaş',
    }));
    const ctx = { comparables: fixedComparables, konum: {}, risk: {} };
    const r1 = kelepirSkoru(baseIlan, ctx);
    const r2 = kelepirSkoru(baseIlan, ctx);
    expect(r1.toplam).toBe(r2.toplam);
    expect(r1.bilesenler.kalite.deger).toBe(r2.bilesenler.kalite.deger);
  });
});
