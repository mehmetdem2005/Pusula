import { describe, it, expect } from 'vitest';
import { LocationRequest, LocationResponse } from '../../src/contracts/location.js';

const trace_id = crypto.randomUUID();

describe('LocationRequest', () => {
  it('minimal valid', () => {
    expect(LocationRequest.safeParse({ il: 'İstanbul', ilce: 'Beşiktaş', trace_id }).success).toBe(true);
  });
  it('enlem boylam opsiyonel', () => {
    const r = LocationRequest.parse({ il: 'İzmir', ilce: 'Konak', trace_id });
    expect(r.enlem).toBeUndefined();
  });
});

describe('LocationResponse', () => {
  it('boş context + 0 confidence valid', () => {
    expect(LocationResponse.safeParse({
      context: {},
      fallbacks_used: [],
      confidence: 0,
      trace_id,
    }).success).toBe(true);
  });
  it('quintile dışı reject', () => {
    expect(LocationResponse.safeParse({
      context: { mahalle_gelir_quintile: 7 as never },
      fallbacks_used: [],
      confidence: 50,
      trace_id,
    }).success).toBe(false);
  });
  it('confidence 100 üstü reject', () => {
    expect(LocationResponse.safeParse({
      context: {},
      fallbacks_used: [],
      confidence: 101,
      trace_id,
    }).success).toBe(false);
  });
});
