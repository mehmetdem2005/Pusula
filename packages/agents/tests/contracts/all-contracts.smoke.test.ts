import { describe, it, expect } from 'vitest';
import {
  ScoringRequest,
  ScoringResponse,
  ComparableRequest,
  ComparableResponse,
  LocationRequest,
  LocationResponse,
  RiskRequest,
  RiskResponse,
  VisionRequest,
  VisionResponse,
  NLPRequest,
  NLPResponse,
  MarketRequest,
  MarketResponse,
  NegotiationRequest,
  NegotiationResponse,
  MarketingRequest,
  MarketingResponse,
} from '../../src/contracts/index.js';

const traceId = crypto.randomUUID();

describe('Agent contracts — smoke', () => {
  it('Tüm contract şemaları import edilebilir', () => {
    const schemas = [
      ScoringRequest, ScoringResponse,
      ComparableRequest, ComparableResponse,
      LocationRequest, LocationResponse,
      RiskRequest, RiskResponse,
      VisionRequest, VisionResponse,
      NLPRequest, NLPResponse,
      MarketRequest, MarketResponse,
      NegotiationRequest, NegotiationResponse,
      MarketingRequest, MarketingResponse,
    ];
    expect(schemas.every((s) => typeof s.safeParse === 'function')).toBe(true);
  });

  it('LocationRequest — minimal valid', () => {
    expect(LocationRequest.safeParse({ il: 'İstanbul', ilce: 'Beşiktaş', trace_id: traceId }).success).toBe(true);
  });

  it('RiskRequest — boş optional alanlar ile valid', () => {
    expect(RiskRequest.safeParse({ trace_id: traceId }).success).toBe(true);
  });

  it('ComparableRequest — strategy default \'hybrid\'', () => {
    const parsed = ComparableRequest.parse({ ilan_id: crypto.randomUUID(), trace_id: traceId });
    expect(parsed.strategy).toBe('hybrid');
    expect(parsed.k).toBe(20);
  });

  it('MarketingRequest — default ton ve uzunluk', () => {
    const parsed = MarketingRequest.parse({
      ilan_id: crypto.randomUUID(),
      format: 'ilan_aciklama',
      trace_id: traceId,
    });
    expect(parsed.tone).toBe('profesyonel');
    expect(parsed.length).toBe('orta');
    expect(parsed.include_hashtags).toBe(true);
  });

  it('NegotiationRequest — opaque scoring_summary kabul', () => {
    expect(
      NegotiationRequest.safeParse({
        ilan_id: crypto.randomUUID(),
        scoring_summary: { toplam: 78 },
        trace_id: traceId,
      }).success,
    ).toBe(true);
  });

  it('VisionRequest — boş foto listesi valid', () => {
    expect(VisionRequest.safeParse({ foto_urlleri: [], trace_id: traceId }).success).toBe(true);
  });

  it('Trace_id UUID değilse reject', () => {
    expect(LocationRequest.safeParse({ il: 'İstanbul', ilce: 'Beşiktaş', trace_id: 'not-a-uuid' }).success).toBe(false);
  });
});
