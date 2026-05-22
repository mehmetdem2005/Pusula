import { describe, it, expect } from 'vitest';
import { NLPRequest, NLPResponse } from '../../src/contracts/nlp.js';

const trace_id = crypto.randomUUID();

describe('NLPRequest', () => {
  it('baslik zorunlu', () => {
    expect(NLPRequest.safeParse({ trace_id }).success).toBe(false);
  });
  it('aciklama opsiyonel', () => {
    expect(NLPRequest.safeParse({ baslik: 'Test', trace_id }).success).toBe(true);
  });
});

describe('NLPResponse', () => {
  it('happy path', () => {
    expect(
      NLPResponse.safeParse({
        result: {
          misleading_word_density: 12.5,
          missing_info_signals: ['kat_sayisi_yok'],
          copy_paste_flag: false,
          tonality_score: 15,
          hidden_features: [],
          suspicion_lexicon_hits: [],
        },
        model_used: 'lexicon+llm',
        trace_id,
      }).success,
    ).toBe(true);
  });
  it('tonality_score [-100,100] dışı reject', () => {
    expect(
      NLPResponse.safeParse({
        result: {
          misleading_word_density: 0,
          missing_info_signals: [],
          copy_paste_flag: false,
          tonality_score: 200,
          hidden_features: [],
          suspicion_lexicon_hits: [],
        },
        model_used: 'x',
        trace_id,
      }).success,
    ).toBe(false);
  });
});
