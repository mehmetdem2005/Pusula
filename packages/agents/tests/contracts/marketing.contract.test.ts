import { describe, it, expect } from 'vitest';
import { MarketingRequest, MarketingResponse } from '../../src/contracts/marketing.js';

const trace_id = crypto.randomUUID();
const ilan_id = crypto.randomUUID();

describe('MarketingRequest', () => {
  it('default ton ve uzunluk', () => {
    const r = MarketingRequest.parse({ ilan_id, format: 'ilan_aciklama', trace_id });
    expect(r.tone).toBe('profesyonel');
    expect(r.length).toBe('orta');
    expect(r.include_hashtags).toBe(true);
    expect(r.persona).toBe('agent_seller');
  });
  it('format enum dışı reject', () => {
    expect(
      MarketingRequest.safeParse({ ilan_id, format: 'tiktok' as never, trace_id }).success,
    ).toBe(false);
  });
});

describe('MarketingResponse', () => {
  it('default arrays', () => {
    const r = MarketingResponse.parse({ metin: '...', llm_cost_usd: 0.01, trace_id });
    expect(r.variants).toEqual([]);
    expect(r.hashtags).toEqual([]);
  });
});
