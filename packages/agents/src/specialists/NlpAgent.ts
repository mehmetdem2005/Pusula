/**
 * NlpAgent — Tier 1
 * docs/11-multi-agent-mimarisi.md §4.6, docs/10-aaa-skorlama-spec.md §3.6
 */
import { z } from 'zod';
import { NLPRequest, NLPResponse } from '../contracts/nlp.js';
import type { Logger } from '../runtime/Logger.js';
import type { LLMGateway } from '@pusula/llm-gateway';

const MISLEADING_LEXICON = [
  'acil', 'kelepir', 'sahibinden', 'muhteşem', 'harika', 'ucuz',
  'fırsat', 'kaçırılmaz', 'aceleci', 'son fiyat', 'pazarlıksız',
];

const SUSPICION_LEXICON = ['hisseli', '2-B', 'tahsisli', 'acele', 'mecburiyet'];

export class NlpAgent {
  static readonly name = 'nlp' as const;
  static readonly inputSchema = NLPRequest;
  static readonly outputSchema = NLPResponse;

  constructor(private llmGateway: LLMGateway, private logger: Logger) {}

  async handle(req: z.infer<typeof NLPRequest>): Promise<z.infer<typeof NLPResponse>> {
    this.logger.info('NlpAgent.handle', { trace_id: req.trace_id });

    const fullText = `${req.baslik} ${req.aciklama ?? ''}`.toLowerCase();
    const words = fullText.split(/\s+/);
    const misleadingHits = words.filter((w) =>
      MISLEADING_LEXICON.some((m) => w.includes(m))
    ).length;
    const misleadingDensity = words.length > 0 ? (misleadingHits / words.length) * 100 : 0;

    const suspicionHits = SUSPICION_LEXICON.filter((s) => fullText.includes(s));

    // TODO: LLM ile tonalite + hidden feature + copy-paste detection
    return {
      result: {
        misleading_word_density: Math.min(misleadingDensity, 100),
        missing_info_signals: [],
        copy_paste_flag: false,
        tonality_score: 0,
        hidden_features: [],
        suspicion_lexicon_hits: suspicionHits,
      },
      model_used: 'lexicon-only-stub',
      trace_id: req.trace_id,
    };
  }
}
