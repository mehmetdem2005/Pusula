/**
 * AFAD deprem tehlike haritası tool worker — Tier 3
 * docs/11-multi-agent-mimarisi.md §6
 *
 * Veri kaynağı: AFAD Türkiye Deprem Tehlike Haritası
 * https://www.afad.gov.tr/turkiye-deprem-tehlike-haritasi
 */

export type DepremTehlikeBandi = 1 | 2 | 3 | 4;

/**
 * Verilen koordinat için AFAD tehlike bandını döner.
 * Public API yok — V1'de raster image processing veya official partner API gerekli.
 * MVP'de ilçe → bant mapping tablosu kullanılır (statik).
 */
export async function depremTehlikeBandi(
  _enlem: number,
  _boylam: number,
): Promise<DepremTehlikeBandi | null> {
  // TODO: koordinat → raster lookup veya ilçe ortalaması
  return null;
}

/**
 * En yakın aktif fay hattına mesafe (metre).
 * Kaynak: MTA diri fay veritabanı.
 */
export async function fayMesafesi(
  _enlem: number,
  _boylam: number,
): Promise<{ distance_m: number; fault_name: string } | null> {
  // TODO: MTA diri fay shapefile + spatial query
  return null;
}
