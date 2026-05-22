import type { KonutInput } from '@pusula/shared';
import { clamp01_100 } from './utils.js';

export interface RiskContext {
  /** AFAD tehlike bandı 1 (en yüksek risk) - 4 (en düşük risk) */
  deprem_tehlike_bandi?: 1 | 2 | 3 | 4;
  /** Bina inşa yılı — TBDY 2019 öncesi/sonrası ayrımı için */
  insa_yili?: number;
  /** En yakın aktif fay hattına mesafe (metre) */
  fay_mesafe_m?: number;
  /** Kentsel dönüşüm bölgesi mi (riskli yapı / dönüşüm fırsatı) */
  kentsel_donusum?: 'riskli' | 'donusum_bolgesi' | 'normal';
}

interface F { key: string; weight: number; adjustment: number | null }

/**
 * Risk skoru — 50 nötr başlar, her bileşen + veya - getirir.
 * Yüksek skor = düşük risk = kullanıcı için iyi.
 */
export function riskSkoru(
  input: KonutInput,
  ctx: RiskContext
): {
  skor: number;
  breakdown: Array<{ key: string; deger: number }>;
  uyarilar: string[];
  ceza_uygula: boolean;
} {
  const uyarilar: string[] = [];
  const inse = ctx.insa_yili ?? (new Date().getFullYear() - input.bina_yasi);

  const features: F[] = [
    {
      key: 'deprem_tehlike',
      weight: 0.40,
      adjustment:
        ctx.deprem_tehlike_bandi === undefined
          ? null
          : ctx.deprem_tehlike_bandi === 1
            ? -20
            : ctx.deprem_tehlike_bandi === 2
              ? 0
              : ctx.deprem_tehlike_bandi === 3
                ? +10
                : +20,
    },
    {
      key: 'tbdy_uyum',
      weight: 0.25,
      adjustment: inse >= 2019 ? +20 : inse >= 2000 ? -5 : -20,
    },
    {
      key: 'fay_mesafe',
      weight: 0.10,
      adjustment:
        ctx.fay_mesafe_m === undefined ? null : ctx.fay_mesafe_m < 500 ? -20 : ctx.fay_mesafe_m < 2000 ? -5 : +10,
    },
    {
      key: 'tapu_durumu',
      weight: 0.10,
      adjustment:
        input.tapu_durumu === undefined
          ? null
          : input.tapu_durumu === 'kat_mulkiyeti' || input.tapu_durumu === 'mustakil'
            ? +20
            : input.tapu_durumu === 'kat_irtifaki'
              ? +5
              : input.tapu_durumu === 'hisseli'
                ? -15
                : input.tapu_durumu === 'tahsis'
                  ? -25
                  : 0,
    },
    {
      key: 'krediye_uygun',
      weight: 0.05,
      adjustment:
        input.krediye_uygun === undefined || input.krediye_uygun === 'bilinmiyor'
          ? null
          : input.krediye_uygun === 'evet'
            ? +15
            : input.krediye_uygun === 'kismen'
              ? 0
              : -15,
    },
    {
      key: 'kentsel_donusum',
      weight: 0.10,
      adjustment:
        ctx.kentsel_donusum === undefined
          ? null
          : ctx.kentsel_donusum === 'riskli'
            ? -25
            : ctx.kentsel_donusum === 'donusum_bolgesi'
              ? +20
              : 0,
    },
  ];

  let net = 50;
  const breakdown: Array<{ key: string; deger: number }> = [];

  for (const f of features) {
    if (f.adjustment === null) continue;
    const delta = f.adjustment * (f.weight / 0.4); // weight 0.4'lük max'e göre normalize (bir bileşenin tek başına -20'den fazla götürmemesi için)
    net += delta;
    breakdown.push({ key: f.key, deger: delta });
  }

  const skor = clamp01_100(net);

  // Uyarılar
  if (ctx.deprem_tehlike_bandi === 1 && inse < 2019) {
    uyarilar.push('⚠️ Yüksek deprem riski + TBDY 2019 öncesi bina');
  }
  if (ctx.fay_mesafe_m !== undefined && ctx.fay_mesafe_m < 500) {
    uyarilar.push('⚠️ Aktif fay hattına 500 metreden yakın');
  }
  if (input.tapu_durumu === 'hisseli') {
    uyarilar.push('⚠️ Hisseli tapu — alımda hukuki danışmanlık şart');
  }
  if (input.tapu_durumu === 'tahsis') {
    uyarilar.push('⚠️ Tahsisli arazi — mülkiyet riski yüksek');
  }
  if (ctx.kentsel_donusum === 'riskli') {
    uyarilar.push('⚠️ Riskli yapı — kentsel dönüşüm kapsamında');
  }

  // Ana skoru cezalandır mı?
  const ceza_uygula = skor < 25;

  return { skor, breakdown, uyarilar, ceza_uygula };
}
