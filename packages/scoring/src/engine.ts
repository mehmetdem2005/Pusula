import type { SkorSonucu } from '@pusula/shared';

/**
 * Abstract ScoringEngine kontratı.
 *
 * docs/10-aaa-skorlama-spec.md §6.2 ile uyumlu. Konut, arsa, oto ve gelecek
 * dikeyler bu interface'i implement eder. Caller (ScoringAgent veya direkt
 * API) dikey-agnostik kalır.
 */
export interface ScoringEngine<TInput, TContext> {
  /** Dikey adı (logging/telemetri için). */
  readonly vertical: 'konut' | 'arsa' | 'oto' | 'ofis';

  /** Şu an aktif formül versiyonu. Her bump SCORING_FORMULA_VERSION ile eş. */
  readonly formulVersion: string;

  /** Bir varlığı skorla. Pure: aynı input → aynı output. */
  score(input: TInput, ctx: TContext): SkorSonucu;
}

/**
 * Engine factory — multi-vertical registry. Caller `engineFor('konut')` der.
 *
 * V0.2: arsa engine, V1: oto engine. Şimdilik sadece konut kayıtlı.
 */
const REGISTRY = new Map<string, ScoringEngine<unknown, unknown>>();

export function registerEngine<TIn, TCtx>(engine: ScoringEngine<TIn, TCtx>): void {
  if (REGISTRY.has(engine.vertical)) {
    throw new Error(`ScoringEngine for vertical '${engine.vertical}' already registered`);
  }
  REGISTRY.set(engine.vertical, engine as ScoringEngine<unknown, unknown>);
}

export function engineFor<TIn = unknown, TCtx = unknown>(
  vertical: string,
): ScoringEngine<TIn, TCtx> {
  const e = REGISTRY.get(vertical);
  if (!e) throw new Error(`No ScoringEngine registered for vertical '${vertical}'`);
  return e as ScoringEngine<TIn, TCtx>;
}

export function listEngines(): string[] {
  return Array.from(REGISTRY.keys());
}
