import { describe, it, expect } from 'vitest';
import { NegotiationRequest, NegotiationResponse } from '../../src/contracts/negotiation.js';

const trace_id = crypto.randomUUID();
const ilan_id = crypto.randomUUID();

describe('NegotiationRequest', () => {
  it('scoring_summary opaque (z.unknown) — herhangi bir değer kabul', () => {
    expect(
      NegotiationRequest.safeParse({ ilan_id, scoring_summary: { foo: 1 }, trace_id }).success,
    ).toBe(true);
  });
});

describe('NegotiationResponse', () => {
  it('happy path', () => {
    expect(
      NegotiationResponse.safeParse({
        result: {
          marj_tahmini_yuzde: { min: 3, likely: 7, max: 12 },
          taktik: 'orta',
          taktik_gerekce: 'piyasa altı',
          ipuclari: ['Krediye uygun olmayışı pazarlık koz'],
          musteri_mesaj_draft: 'Merhaba, ...',
          red_flags: [],
        },
        llm_cost_usd: 0.025,
        trace_id,
      }).success,
    ).toBe(true);
  });
  it('taktik enum dışı reject', () => {
    expect(
      NegotiationResponse.safeParse({
        result: {
          marj_tahmini_yuzde: { min: 3, likely: 7, max: 12 },
          taktik: 'foo' as never,
          taktik_gerekce: '',
          ipuclari: [],
          musteri_mesaj_draft: '',
          red_flags: [],
        },
        llm_cost_usd: 0,
        trace_id,
      }).success,
    ).toBe(false);
  });
});
