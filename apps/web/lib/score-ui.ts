/** Skor etiketi → Türkçe başlık + tasarım band sınıfı (`.band <band>` ile kullanılır). */
export interface BandInfo {
  label: string;
  band: string;
}

export function scoreBand(etiket: string | null | undefined): BandInfo {
  switch (etiket) {
    case 'kacirilmaz':
      return { label: 'Kaçırılmaz', band: 'kacirilmaz' };
    case 'kelepir':
      return { label: 'Kelepir', band: 'kelepir' };
    case 'iyi_fiyat':
      return { label: 'İyi Fiyat', band: 'iyi' };
    case 'piyasa':
      return { label: 'Piyasa', band: 'piyasa' };
    case 'pahali':
      return { label: 'Pahalı', band: 'pahali' };
    case 'asiri_pahali':
      return { label: 'Aşırı Pahalı', band: 'asiri' };
    default:
      return { label: 'Skor yok', band: '' };
  }
}

/** Skor sayısına göre band sınıfı (etiket yoksa). */
export function scoreBandByValue(toplam: number): string {
  if (toplam >= 70) return 'kelepir';
  if (toplam >= 55) return 'iyi';
  if (toplam >= 40) return 'piyasa';
  if (toplam >= 25) return 'pahali';
  return 'asiri';
}

/** Skor sayısına göre token metin rengi sınıfı. */
export function scoreColor(toplam: number): string {
  if (toplam >= 70) return 'text-band-kelepir';
  if (toplam >= 55) return 'text-band-iyi-fiyat';
  if (toplam >= 40) return 'text-band-piyasa';
  if (toplam >= 25) return 'text-band-pahali';
  return 'text-band-asiri';
}

/**
 * Pilar anahtarı → CSS renk değişkeni. 4 pilar bugün, 8 pilar gelecekte; backend hangi
 * anahtarları gönderirse otomatik renklenir (eşleşmeyen → lacivert).
 */
const PILLAR_VARS: Record<string, string> = {
  fiyat_avantaji: 'var(--p-fiyat)',
  fiyat: 'var(--p-fiyat)',
  kalite: 'var(--p-kalite)',
  konum: 'var(--p-konum)',
  risk: 'var(--p-risk)',
  vision: 'var(--p-vision)',
  nlp: 'var(--p-nlp)',
  pazar: 'var(--p-pazar)',
  pazar_dinamigi: 'var(--p-pazar)',
  finansal: 'var(--p-finansal)',
  finansal_model: 'var(--p-finansal)',
};

export function pillarColor(key: string): string {
  return PILLAR_VARS[key] ?? 'var(--navy)';
}

/** Pilar anahtarı → Türkçe etiket (bilinmeyen anahtar olduğu gibi gösterilir). */
const PILLAR_LABELS: Record<string, string> = {
  fiyat_avantaji: 'Fiyat Avantajı',
  fiyat: 'Fiyat Avantajı',
  kalite: 'Kalite',
  konum: 'Konum',
  risk: 'Risk',
  vision: 'Vision',
  nlp: 'NLP',
  pazar: 'Pazar Dinamiği',
  pazar_dinamigi: 'Pazar Dinamiği',
  finansal: 'Finansal Model',
  finansal_model: 'Finansal Model',
};

export function pillarLabel(key: string): string {
  return PILLAR_LABELS[key] ?? key;
}

export const TRY = new Intl.NumberFormat('tr-TR', {
  style: 'currency',
  currency: 'TRY',
  maximumFractionDigits: 0,
});
