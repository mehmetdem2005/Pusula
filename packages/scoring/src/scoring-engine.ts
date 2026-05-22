import type { KonutInput, SkorSonucu, SkorBileseni } from '@pusula/shared';
import { DEFAULT_SCORE_WEIGHTS, SCORING_FORMULA_VERSION, type ScoreWeights } from '@pusula/shared';
import { fiyatAvantajiSkoru, type KomparableIlan } from './price-advantage.js';
import { kaliteSkoru } from './quality.js';
import { konumSkoru, type KonumContext } from './location.js';
import { riskSkoru, type RiskContext } from './risk.js';
import { skorEtiketi } from './labels.js';
import { clamp01_100 } from './utils.js';

export interface ScoringContext {
  comparables: KomparableIlan[];
  konum: KonumContext;
  risk: RiskContext;
}

export interface ScoringOptions {
  /** Ağırlık override (kullanıcı tercihi). Toplamı 1 olmalı. */
  weights?: ScoreWeights;
}

export class InvalidWeightsError extends Error {
  readonly code = 'INVALID_WEIGHTS';
  constructor(public readonly sum: number) {
    super(`Ağırlık toplamı 1 olmalı, mevcut: ${sum}`);
  }
}

/**
 * Ana skorlama fonksiyonu — bir konut ilanı için kelepir skorunu üretir.
 * Deterministic + pure: same input → same output. LLM yok.
 */
export function kelepirSkoru(
  input: KonutInput,
  ctx: ScoringContext,
  opts: ScoringOptions = {},
): SkorSonucu {
  const w = opts.weights ?? DEFAULT_SCORE_WEIGHTS;

  const sum = w.fiyat_avantaji + w.kalite + w.konum + w.risk;
  if (Math.abs(sum - 1.0) > 0.001) {
    throw new InvalidWeightsError(sum);
  }

  const fa = fiyatAvantajiSkoru(input, ctx.comparables);
  const kq = kaliteSkoru(input);
  const ks = konumSkoru(input, ctx.konum);
  const rs = riskSkoru(input, ctx.risk);

  let toplam =
    w.fiyat_avantaji * fa.skor + w.kalite * kq.skor + w.konum * ks.skor + w.risk * rs.skor;

  if (rs.ceza_uygula) {
    toplam *= 0.7;
  }
  toplam = clamp01_100(toplam);

  const fiyatBileseni: SkorBileseni = {
    ad: 'fiyat_avantaji',
    deger: fa.skor,
    agirlik: w.fiyat_avantaji,
    katki: w.fiyat_avantaji * fa.skor,
  };
  const kaliteBileseni: SkorBileseni = {
    ad: 'kalite',
    deger: kq.skor,
    agirlik: w.kalite,
    katki: w.kalite * kq.skor,
  };
  const konumBileseni: SkorBileseni = {
    ad: 'konum',
    deger: ks.skor,
    agirlik: w.konum,
    katki: w.konum * ks.skor,
  };
  const riskBileseni: SkorBileseni = {
    ad: 'risk',
    deger: rs.skor,
    agirlik: w.risk,
    katki: w.risk * rs.skor,
  };

  const altBilesenler: Record<string, { deger: number; agirlik: number }> = {};
  for (const b of kq.breakdown) altBilesenler[`kalite.${b.key}`] = { deger: b.deger, agirlik: b.agirlik };
  for (const b of ks.breakdown) altBilesenler[`konum.${b.key}`] = { deger: b.deger, agirlik: b.agirlik };
  for (const b of rs.breakdown) altBilesenler[`risk.${b.key}`] = { deger: b.deger, agirlik: 0 };

  return {
    toplam,
    etiket: skorEtiketi(toplam),
    bilesenler: {
      fiyat_avantaji: fiyatBileseni,
      kalite: kaliteBileseni,
      konum: konumBileseni,
      risk: riskBileseni,
    },
    alt_bilesenler: altBilesenler,
    comparable: fa.ozet,
    confidence: fa.confidence,
    uyarilar: rs.uyarilar,
    hesap_zamani: new Date().toISOString(),
    formul_versiyonu: SCORING_FORMULA_VERSION,
  };
}
