import type { KonutInput } from '@pusula/shared';
import type { ScoringContext } from '@pusula/scoring';

type RiskContext = ScoringContext['risk'];

/**
 * İl bazında AFAD deprem tehlike bandı yaklaşımı (1 = en yüksek risk … 4 = en düşük).
 * AFAD 2018 Türkiye Deprem Tehlike Haritası'ndaki PGA bölgelerine dayanan İL düzeyinde
 * bir yaklaşıklamadır; bina düzeyinde kesinlik için koordinat bazlı AFAD sorgusu (sonraki faz)
 * gerekir. İsimler normalize edilir (küçük harf, Türkçe karakter sadeleştirme).
 */
const PROVINCE_BAND: Record<string, 1 | 2 | 3 | 4> = {
  // Band 1 — en yüksek (Kuzey/Doğu Anadolu Fayı, Ege grabenleri)
  istanbul: 1,
  kocaeli: 1,
  sakarya: 1,
  duzce: 1,
  bolu: 1,
  yalova: 1,
  bursa: 1,
  balikesir: 1,
  canakkale: 1,
  manisa: 1,
  izmir: 1,
  aydin: 1,
  denizli: 1,
  mugla: 1,
  kutahya: 1,
  bingol: 1,
  erzincan: 1,
  mus: 1,
  bitlis: 1,
  van: 1,
  elazig: 1,
  malatya: 1,
  tunceli: 1,
  kahramanmaras: 1,
  hatay: 1,
  osmaniye: 1,
  adiyaman: 1,
  // Band 2 — yüksek
  tekirdag: 2,
  kirklareli: 2,
  edirne: 2,
  bilecik: 2,
  eskisehir: 2,
  afyonkarahisar: 2,
  usak: 2,
  burdur: 2,
  isparta: 2,
  antalya: 2,
  kilis: 2,
  gaziantep: 2,
  sanliurfa: 2,
  diyarbakir: 2,
  batman: 2,
  siirt: 2,
  sirnak: 2,
  hakkari: 2,
  agri: 2,
  igdir: 2,
  kars: 2,
  ardahan: 2,
  erzurum: 2,
  bayburt: 2,
  gumushane: 2,
  amasya: 2,
  tokat: 2,
  corum: 2,
  yozgat: 2,
  cankiri: 2,
  // Band 3 — orta
  ankara: 3,
  kirikkale: 3,
  sivas: 3,
  kayseri: 3,
  nigde: 3,
  mersin: 3,
  adana: 3,
  kastamonu: 3,
  sinop: 3,
  samsun: 3,
  ordu: 3,
  giresun: 3,
  trabzon: 3,
  rize: 3,
  artvin: 3,
  zonguldak: 3,
  bartin: 3,
  karabuk: 3,
  mardin: 3,
  kirsehir: 3,
  // Band 4 — düşük (iç Anadolu, görece stabil)
  konya: 4,
  karaman: 4,
  nevsehir: 4,
  aksaray: 4,
};

function normalizeIl(il: string): string {
  return il
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/İ/g, 'i')
    .replace(/ş/g, 's')
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .trim();
}

/**
 * İlan girdisinden risk context üret: il → deprem bandı + inşa yılı (bina_yaşından).
 * Veri yoksa ilgili alan boş bırakılır (skor o bileşeni atlar).
 */
export function buildRiskContext(input: KonutInput): RiskContext {
  const ctx: RiskContext = {};
  if (input.il) {
    const band = PROVINCE_BAND[normalizeIl(input.il)];
    if (band) ctx.deprem_tehlike_bandi = band;
  }
  if (typeof input.bina_yasi === 'number') {
    ctx.insa_yili = new Date().getFullYear() - input.bina_yasi;
  }
  return ctx;
}
