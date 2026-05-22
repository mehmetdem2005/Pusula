import type { KonutInput, SkorSonucu } from '@pusula/shared';
import { SCORING_FORMULA_VERSION } from '@pusula/shared';
import { kelepirSkoru, type ScoringContext, type ScoringOptions } from './scoring-engine.js';
import type { ScoringEngine } from './engine.js';
import { registerEngine } from './engine.js';

/**
 * Konut dikey engine — `kelepirSkoru` pure function'ı kapsayan adapter.
 *
 * V1'de docs/10 8-pillar geçişinde bu sınıfın içi genişler; dışarıdaki
 * `ScoringEngine` interface'i değişmez (Open/Closed).
 */
export class KonutEngine implements ScoringEngine<KonutInput, ScoringContext> {
  readonly vertical = 'konut' as const;
  readonly formulVersion = SCORING_FORMULA_VERSION;

  constructor(private opts: ScoringOptions = {}) {}

  score(input: KonutInput, ctx: ScoringContext): SkorSonucu {
    return kelepirSkoru(input, ctx, this.opts);
  }
}

/** Auto-register default Konut engine. */
registerEngine(new KonutEngine());
