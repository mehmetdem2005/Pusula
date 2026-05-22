import { describe, it, expect } from 'vitest';
import { RiskRequest, RiskResponse } from '../../src/contracts/risk.js';

const trace_id = crypto.randomUUID();

describe('RiskRequest', () => {
  it('hepsi opsiyonel — sadece trace_id ile valid', () => {
    expect(RiskRequest.safeParse({ trace_id }).success).toBe(true);
  });
});

describe('RiskResponse', () => {
  it('deprem bandı 1-4 valid', () => {
    for (const band of [1, 2, 3, 4] as const) {
      const r = RiskResponse.safeParse({
        context: { deprem_tehlike_bandi: band },
        uyarilar: [],
        data_sources: ['afad'],
        trace_id,
      });
      expect(r.success).toBe(true);
    }
  });
  it('deprem bandı 5 reject', () => {
    expect(
      RiskResponse.safeParse({
        context: { deprem_tehlike_bandi: 5 as never },
        uyarilar: [],
        data_sources: [],
        trace_id,
      }).success,
    ).toBe(false);
  });
  it('kentsel donusum enum dışı reject', () => {
    expect(
      RiskResponse.safeParse({
        context: { kentsel_donusum: 'foo' as never },
        uyarilar: [],
        data_sources: [],
        trace_id,
      }).success,
    ).toBe(false);
  });
});
