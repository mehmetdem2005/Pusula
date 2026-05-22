/**
 * TÜİK açık veri tool worker — Tier 3
 * Kaynak: https://data.tuik.gov.tr
 */

export interface TuikMahalleData {
  il: string;
  ilce: string;
  mahalle: string;
  nufus: number;
  gelir_quintile: 1 | 2 | 3 | 4 | 5;
  yas_dagilimi: { '0-14': number; '15-29': number; '30-44': number; '45-64': number; '65+': number };
  data_year: number;
}

/**
 * MVP: önceden import edilmiş TÜİK CSV'sini Supabase'den okur.
 * V1: API entegrasyonu (varsa) veya periodic ingest.
 */
export async function getMahalleData(
  _il: string,
  _ilce: string,
  _mahalle: string
): Promise<TuikMahalleData | null> {
  // TODO: Supabase mahalle_enrichment tablo
  return null;
}
