/** Skor etiketi → Türkçe başlık + renk sınıfı (rozet). */
export function scoreBadge(etiket: string | null | undefined): { label: string; cls: string } {
  switch (etiket) {
    case 'kacirilmaz':
      return { label: 'Kaçırılmaz', cls: 'bg-green-100 text-green-800' };
    case 'kelepir':
      return { label: 'Kelepir', cls: 'bg-green-100 text-green-700' };
    case 'iyi_fiyat':
      return { label: 'İyi Fiyat', cls: 'bg-teal-100 text-teal-700' };
    case 'piyasa':
      return { label: 'Piyasa', cls: 'bg-slate-100 text-slate-600' };
    case 'pahali':
      return { label: 'Pahalı', cls: 'bg-orange-100 text-orange-700' };
    case 'asiri_pahali':
      return { label: 'Aşırı Pahalı', cls: 'bg-red-100 text-red-700' };
    default:
      return { label: 'Skor yok', cls: 'bg-slate-100 text-slate-500' };
  }
}

/** Skor sayısına göre çember/metin rengi. */
export function scoreColor(toplam: number): string {
  if (toplam >= 70) return 'text-green-600';
  if (toplam >= 55) return 'text-teal-600';
  if (toplam >= 40) return 'text-slate-600';
  if (toplam >= 25) return 'text-orange-600';
  return 'text-red-600';
}

export const TRY = new Intl.NumberFormat('tr-TR', {
  style: 'currency',
  currency: 'TRY',
  maximumFractionDigits: 0,
});
