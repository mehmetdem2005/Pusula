import { describe, it, expect } from 'vitest';
import { MarketRequest, MarketResponse } from '../../src/contracts/market.js';

const trace_id = crypto.randomUUID();

describe('MarketRequest', () => {
  it('mahalle + ilçe zorunlu', () => {
    expect(MarketRequest.safeParse({ trace_id, mahalle: 'X', ilce: 'Y' }).success).toBe(true);
    expect(MarketRequest.safeParse({ trace_id, mahalle: 'X' }).success).toBe(false);
  });
});

describe('MarketResponse', () => {
  it('boş dynamics + freshness valid', () => {
    expect(
      MarketResponse.safeParse({
        dynamics: {},
        data_freshness: new Date().toISOString(),
        trace_id,
      }).success,
    ).toBe(true);
  });
  it('liquidity_score 0-100 dışı reject', () => {
    expect(
      MarketResponse.safeParse({
        dynamics: { liquidity_score: -5 },
        data_freshness: new Date().toISOString(),
        trace_id,
      }).success,
    ).toBe(false);
  });
});
