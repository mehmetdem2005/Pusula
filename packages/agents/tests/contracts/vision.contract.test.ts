import { describe, it, expect } from 'vitest';
import { VisionRequest, VisionResponse } from '../../src/contracts/vision.js';

const trace_id = crypto.randomUUID();

describe('VisionRequest', () => {
  it('boş foto listesi valid (parser foto bulamamış senaryosu)', () => {
    expect(VisionRequest.safeParse({ foto_urlleri: [], trace_id }).success).toBe(true);
  });
  it('foto_urlleri URL olmayan eleman reject', () => {
    expect(VisionRequest.safeParse({ foto_urlleri: ['not-a-url'], trace_id }).success).toBe(false);
  });
});

describe('VisionResponse', () => {
  it('minimal happy path', () => {
    const r = VisionResponse.safeParse({
      result: {
        foto_count: 0,
        hidden_defects: [],
        lens_distortion_detected: false,
        perceived_room_size_inconsistency: false,
        structural_inconsistencies: [],
      },
      model_used: 'gemini-2.5-flash',
      cost_usd: 0.012,
      trace_id,
    });
    expect(r.success).toBe(true);
  });
  it('natural_light_score 0-100 dışı reject', () => {
    expect(
      VisionResponse.safeParse({
        result: {
          foto_count: 5,
          natural_light_score: 150,
          hidden_defects: [],
          lens_distortion_detected: false,
          perceived_room_size_inconsistency: false,
          structural_inconsistencies: [],
        },
        model_used: 'x',
        cost_usd: 0,
        trace_id,
      }).success,
    ).toBe(false);
  });
});
