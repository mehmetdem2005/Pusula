import { describe, it, expect } from 'vitest';
import { ScoringRequest, ScoringResponse } from '../../src/contracts/scoring.js';

const validRequest = {
  ilan: {
    kaynak: 'sahibinden' as const,
    kaynak_id: '12345',
    ilan_url: 'https://www.sahibinden.com/ilan/12345',
    baslik: 'Test',
    fiyat_tl: 4_500_000,
    il: 'İstanbul',
    ilce: 'Beşiktaş',
    net_m2: 95,
    oda_sayisi: '2+1',
    bina_yasi: 12,
    isitma: 'dogalgaz_kombi' as const,
    foto_urlleri: [],
    parse_versiyonu: 'test',
    parse_tarihi: new Date().toISOString(),
  },
  context_options: {
    include_comparables: true,
    include_vision: false,
    include_market: true,
    max_latency_ms: 8000,
  },
  trace_id: crypto.randomUUID(),
};

describe('ScoringRequest contract', () => {
  it('accepts valid request', () => {
    const result = ScoringRequest.safeParse(validRequest);
    expect(result.success).toBe(true);
  });

  it('rejects missing ilan_url', () => {
    const invalid = { ...validRequest, ilan: { ...validRequest.ilan, ilan_url: undefined } };
    const result = ScoringRequest.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects non-uuid trace_id', () => {
    const invalid = { ...validRequest, trace_id: 'not-uuid' };
    const result = ScoringRequest.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

describe('ScoringResponse contract', () => {
  it('accepts well-formed response', () => {
    const response = {
      result: {
        toplam: 78,
        etiket: 'kelepir' as const,
        bilesenler: {
          fiyat_avantaji: { ad: 'fiyat_avantaji', deger: 85, agirlik: 0.45, katki: 38.25 },
          kalite: { ad: 'kalite', deger: 72, agirlik: 0.25, katki: 18 },
          konum: { ad: 'konum', deger: 88, agirlik: 0.20, katki: 17.6 },
          risk: { ad: 'risk', deger: 55, agirlik: 0.10, katki: 5.5 },
        },
        alt_bilesenler: {},
        comparable: { count: 23, ilan_m2_tl: 47368, z_score: 0.8 },
        confidence: 'high' as const,
        uyarilar: [],
        hesap_zamani: new Date().toISOString(),
        formul_versiyonu: 'konut_v1.0',
      },
      pillar_durations_ms: { fiyat_avantaji: 12, kalite: 5, konum: 80, risk: 30 },
      total_duration_ms: 145,
      trace_id: crypto.randomUUID(),
    };
    const result = ScoringResponse.safeParse(response);
    expect(result.success).toBe(true);
  });

  it('rejects toplam out of range', () => {
    const response = {
      result: {
        toplam: 150, // INVALID
        etiket: 'kelepir' as const,
        bilesenler: {
          fiyat_avantaji: { ad: 'fiyat_avantaji', deger: 85, agirlik: 0.45, katki: 38.25 },
          kalite: { ad: 'kalite', deger: 72, agirlik: 0.25, katki: 18 },
          konum: { ad: 'konum', deger: 88, agirlik: 0.20, katki: 17.6 },
          risk: { ad: 'risk', deger: 55, agirlik: 0.10, katki: 5.5 },
        },
        alt_bilesenler: {},
        comparable: { count: 23, ilan_m2_tl: 47368, z_score: 0.8 },
        confidence: 'high' as const,
        uyarilar: [],
        hesap_zamani: new Date().toISOString(),
        formul_versiyonu: 'konut_v1.0',
      },
      pillar_durations_ms: {},
      total_duration_ms: 100,
      trace_id: crypto.randomUUID(),
    };
    const result = ScoringResponse.safeParse(response);
    expect(result.success).toBe(false);
  });
});
