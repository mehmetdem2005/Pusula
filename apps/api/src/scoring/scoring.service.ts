import { Injectable } from '@nestjs/common';
import type { KonutInput, SkorSonucu } from '@pusula/shared';
import { kelepirSkoru, type ScoringContext } from '@pusula/scoring';

@Injectable()
export class ScoringService {
  /**
   * Bir konut ilanını skorla.
   * Comparable set, AFAD/TÜİK enrichment vb. context dışarıdan gelir.
   */
  async scoreKonut(input: KonutInput, ctx: ScoringContext): Promise<SkorSonucu> {
    return kelepirSkoru(input, ctx);
  }
}
