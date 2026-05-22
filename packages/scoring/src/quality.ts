import type { KonutInput } from '@pusula/shared';
import { clamp01_100 } from './utils.js';

/** Bina yaşı → skor (yeni daha iyi). */
export function yasScore(yas: number): number {
  if (yas <= 5) return 95;
  if (yas <= 15) return 75;
  if (yas <= 30) return 55;
  if (yas <= 50) return 35;
  return 20;
}

/** Net m² → skor (oda sayısına göre beklenen ile karşılaştır). */
export function m2Score(netM2: number, odaSayisi: string): number {
  const expected: Record<string, number> = {
    'stüdyo': 35,
    '1+0': 35,
    '1+1': 55,
    '2+1': 90,
    '3+1': 130,
    '4+1': 170,
    '5+1': 210,
  };
  const exp = expected[odaSayisi] ?? 90;
  const ratio = netM2 / exp;
  // 1.0 ratio → 75, 1.2 → 90, 0.85 → 55, 0.7 → 35
  if (ratio >= 1.2) return 95;
  if (ratio >= 1.05) return 85;
  if (ratio >= 0.95) return 75;
  if (ratio >= 0.85) return 60;
  if (ratio >= 0.75) return 45;
  return 30;
}

export function brutNetOraniScore(brut?: number, net?: number): number | null {
  if (!brut || !net) return null;
  const ratio = brut / net;
  if (ratio < 1.15) return 95;
  if (ratio < 1.25) return 75;
  if (ratio < 1.35) return 55;
  return 35;
}

export function katScore(kat: number | string | undefined): number | null {
  if (kat === undefined) return null;
  if (typeof kat === 'string') {
    if (kat === 'zemin' || kat === 'bahce_kati') return 30;
    if (kat === 'cati_kati') return 60;
    if (kat === 'mustakil') return 70;
    return null;
  }
  if (kat <= 0) return 30;
  if (kat <= 3) return 80;
  if (kat <= 7) return 90;
  if (kat <= 15) return 70;
  return 55;
}

export function isitmaScore(isitma: KonutInput['isitma']): number {
  const map: Record<KonutInput['isitma'], number> = {
    'dogalgaz_kombi': 90,
    'merkezi_pay_olcer': 80,
    'merkezi': 60,
    'kat_kalorifer': 70,
    'yerden_isitma': 95,
    'klima': 50,
    'soba': 25,
    'yok': 15,
    'bilinmiyor': 50,
  };
  return map[isitma];
}

export function asansorScore(asansor: boolean | undefined, kat: number | string | undefined): number | null {
  if (asansor === undefined) return null;
  if (asansor) return 90;
  if (typeof kat === 'number' && kat >= 3) return 30;
  return 70;
}

export function otoparkScore(otopark: KonutInput['otopark']): number | null {
  if (!otopark) return null;
  const map: Record<NonNullable<KonutInput['otopark']>, number> = {
    'kapali': 90,
    'acik': 75,
    'yok': 40,
  };
  return map[otopark];
}

interface Feature {
  key: string;
  weight: number;
  score: number | null;
}

/**
 * Kalite skoru — alt parametre ağırlıklarıyla weighted average.
 * Eksik parametreler yeniden normalize edilir.
 */
export function kaliteSkoru(input: KonutInput): {
  skor: number;
  breakdown: Array<{ key: string; deger: number; agirlik: number; katki: number }>;
} {
  const features: Feature[] = [
    { key: 'bina_yasi', weight: 0.20, score: yasScore(input.bina_yasi) },
    { key: 'net_m2', weight: 0.15, score: m2Score(input.net_m2, input.oda_sayisi) },
    { key: 'brut_net_orani', weight: 0.10, score: brutNetOraniScore(input.brut_m2, input.net_m2) },
    { key: 'kat', weight: 0.10, score: katScore(input.bulundugu_kat) },
    { key: 'isitma', weight: 0.10, score: isitmaScore(input.isitma) },
    { key: 'asansor', weight: 0.03, score: asansorScore(input.asansor, input.bulundugu_kat) },
    { key: 'otopark', weight: 0.05, score: otoparkScore(input.otopark) },
    { key: 'site_icinde', weight: 0.03, score: input.site_icinde === undefined ? null : input.site_icinde ? 85 : 55 },
    { key: 'esyali', weight: 0.02, score: input.esyali === undefined ? null : input.esyali ? 70 : 50 },
    { key: 'banyo', weight: 0.05, score: input.banyo_sayisi === undefined ? null : input.banyo_sayisi >= 2 ? 85 : 70 },
  ];

  const present = features.filter((f) => f.score !== null) as Array<Feature & { score: number }>;
  const totalWeight = present.reduce((s, f) => s + f.weight, 0);

  if (totalWeight === 0) {
    return { skor: 50, breakdown: [] };
  }

  let skor = 0;
  const breakdown = present.map((f) => {
    const normalizedWeight = f.weight / totalWeight;
    const katki = normalizedWeight * f.score;
    skor += katki;
    return { key: f.key, deger: f.score, agirlik: normalizedWeight, katki };
  });

  return { skor: clamp01_100(skor), breakdown };
}
