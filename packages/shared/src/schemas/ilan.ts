/**
 * İlan (Listing) şemaları — sahibinden konut detay sayfasından parse edilen
 * yapılandırılmış veri modeli. Backend, frontend ve extension paylaşır.
 */
import { z } from 'zod';

export const IsitmaTipi = z.enum([
  'dogalgaz_kombi',
  'merkezi_pay_olcer',
  'merkezi',
  'soba',
  'klima',
  'kat_kalorifer',
  'yerden_isitma',
  'yok',
  'bilinmiyor',
]);
export type IsitmaTipi = z.infer<typeof IsitmaTipi>;

export const TapuDurumu = z.enum([
  'kat_mulkiyeti',
  'kat_irtifaki',
  'hisseli',
  'tahsis',
  'mustakil',
  'bilinmiyor',
]);
export type TapuDurumu = z.infer<typeof TapuDurumu>;

export const Cephe = z.enum(['kuzey', 'guney', 'dogu', 'bati', 'kuzeydogu', 'kuzeybati', 'guneydogu', 'guneybati', 'bilinmiyor']);
export type Cephe = z.infer<typeof Cephe>;

/**
 * Konut (Daire/Müstakil ev) parametreleri.
 * Skorlama motorunun ana input'u.
 */
export const KonutInput = z.object({
  // Kimlik
  kaynak: z.enum(['sahibinden', 'hepsiemlak', 'emlakjet', 'zingat', 'manuel']),
  kaynak_id: z.string(),
  ilan_url: z.string().url(),

  // Başlık ve metin
  baslik: z.string().min(5),
  aciklama: z.string().optional(),

  // Fiyat
  fiyat_tl: z.number().int().positive(),
  ilan_tarihi: z.string().datetime().optional(),

  // Konum
  il: z.string(),
  ilce: z.string(),
  mahalle: z.string().optional(),
  sokak: z.string().optional(),
  enlem: z.number().min(-90).max(90).optional(),
  boylam: z.number().min(-180).max(180).optional(),

  // Fiziksel
  net_m2: z.number().int().positive(),
  brut_m2: z.number().int().positive().optional(),
  oda_sayisi: z.string().regex(/^\d+\+\d+$|^stüdyo$/), // "2+1", "3+1", "stüdyo"
  banyo_sayisi: z.number().int().min(0).max(10).optional(),
  bina_yasi: z.number().int().min(0).max(200),
  bina_kat_sayisi: z.number().int().min(1).max(100).optional(),
  bulundugu_kat: z.union([z.number().int(), z.enum(['zemin', 'bahce_kati', 'cati_kati', 'mustakil'])]).optional(),

  // Özellikler
  isitma: IsitmaTipi,
  asansor: z.boolean().optional(),
  otopark: z.enum(['kapali', 'acik', 'yok']).optional(),
  esyali: z.boolean().optional(),
  site_icinde: z.boolean().optional(),
  krediye_uygun: z.enum(['evet', 'kismen', 'hayir', 'bilinmiyor']).optional(),
  tapu_durumu: TapuDurumu.optional(),
  cephe: z.array(Cephe).optional(),
  balkon: z.boolean().optional(),
  esyali_durum: z.string().optional(),

  // Medya
  foto_urlleri: z.array(z.string().url()).default([]),

  // Meta
  parse_versiyonu: z.string(), // "sahibinden-v3.2"
  parse_tarihi: z.string().datetime(),
  ham_veri: z.record(z.unknown()).optional(), // raw scraped fields
});
export type KonutInput = z.infer<typeof KonutInput>;

/**
 * Arsa/Tarla parametreleri (V0.2'de aktif).
 */
export const ArsaInput = z.object({
  kaynak: z.enum(['sahibinden', 'hepsiemlak', 'emlakjet', 'zingat', 'manuel']),
  kaynak_id: z.string(),
  ilan_url: z.string().url(),
  fiyat_tl: z.number().int().positive(),
  il: z.string(),
  ilce: z.string(),
  mahalle: z.string().optional(),
  m2: z.number().int().positive(),
  imar_durumu: z.enum(['konut', 'ticari', 'sanayi', 'turizm', 'tarim', 'orman', 'belirsiz']),
  ada: z.string().optional(),
  parsel: z.string().optional(),
  enlem: z.number().optional(),
  boylam: z.number().optional(),
  kullanim_izni: z.boolean().optional(),
  altyapi: z
    .object({
      yol: z.boolean().optional(),
      elektrik: z.boolean().optional(),
      su: z.boolean().optional(),
      dogalgaz: z.boolean().optional(),
    })
    .optional(),
});
export type ArsaInput = z.infer<typeof ArsaInput>;

/**
 * Otomobil parametreleri (V2'de aktif).
 */
export const OtoInput = z.object({
  kaynak: z.enum(['sahibinden', 'arabam', 'manuel']),
  kaynak_id: z.string(),
  ilan_url: z.string().url(),
  fiyat_tl: z.number().int().positive(),
  marka: z.string(),
  model: z.string(),
  model_yili: z.number().int().min(1900).max(2030),
  km: z.number().int().min(0),
  yakit: z.enum(['benzin', 'dizel', 'lpg', 'hibrit', 'elektrik']),
  vites: z.enum(['manuel', 'otomatik', 'yarı_otomatik']),
  motor_gucu_hp: z.number().int().positive().optional(),
  motor_hacmi_cc: z.number().int().positive().optional(),
  donanim_paketi: z.string().optional(),
  renk: z.string().optional(),
  hasar_kaydi: z.enum(['var', 'yok', 'bilinmiyor']),
  degisen_parca: z.number().int().min(0).optional(),
  cekis: z.enum(['onden', 'arkadan', '4x4']).optional(),
});
export type OtoInput = z.infer<typeof OtoInput>;
