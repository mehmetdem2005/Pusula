import { describe, it, expect } from 'vitest';
import { ComparableRequest, ComparableResponse } from '../../src/contracts/comparable.js';

const trace_id = crypto.randomUUID();
const ilan_id = crypto.randomUUID();

describe('ComparableRequest contract', () => {
  it('default strategy ve k', () => {
    const r = ComparableRequest.parse({ ilan_id, trace_id });
    expect(r.strategy).toBe('hybrid');
    expect(r.k).toBe(20);
  });
  it('k aralık dışı reject (>50)', () => {
    expect(ComparableRequest.safeParse({ ilan_id, k: 100, trace_id }).success).toBe(false);
  });
  it('k aralık dışı reject (<1)', () => {
    expect(ComparableRequest.safeParse({ ilan_id, k: 0, trace_id }).success).toBe(false);
  });
});

describe('ComparableResponse contract', () => {
  it('boş listeyi kabul', () => {
    const r = ComparableResponse.safeParse({
      items: [],
      total_count: 0,
      strategy_used: 'narrow',
      duration_ms: 12,
      trace_id,
    });
    expect(r.success).toBe(true);
  });

  it('similarity_score 0-1 dışı reject', () => {
    const r = ComparableResponse.safeParse({
      items: [
        {
          id: crypto.randomUUID(),
          ilan_url: 'https://www.sahibinden.com/ilan/1',
          baslik: 'Test',
          fiyat_tl: 1_000_000,
          m2: 90,
          fiyat_per_m2: 11111.11,
          bina_yasi: 5,
          oda_sayisi: '2+1',
          ilce: 'Beşiktaş',
          similarity_score: 1.5, // INVALID
        },
      ],
      total_count: 1,
      strategy_used: 'hybrid',
      duration_ms: 0,
      trace_id,
    });
    expect(r.success).toBe(false);
  });
});
