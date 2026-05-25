import { z } from 'zod';

/**
 * "İlan yapıştır" / foto ile autofill payload'ı.
 * Sunucu LLM ile alanları çıkarır → form doldurur/skorlar. Sunucu hiçbir siteye istek atmaz.
 */
export const ExtractSchema = z
  .object({
    raw_text: z.string().max(20_000).optional(),
    url: z.string().url().max(1000).optional(),
    /** Tam-sayfa ekran görüntüsü (data URL veya ham base64). Vision-LLM ile okunur. */
    screenshot_base64: z.string().max(14_000_000).optional(),
    kaynak: z.enum(['sahibinden', 'hepsiemlak', 'emlakjet', 'zingat', 'manuel']).optional(),
  })
  .refine(
    (b) => !!b.raw_text || !!b.url || !!b.screenshot_base64,
    'raw_text, url veya screenshot_base64 gerekli',
  );
export type ExtractInput = z.infer<typeof ExtractSchema>;

/**
 * Liste sayfasından batch ingest payload'ı (passive collector / eklenti).
 * - URL allowlist: sadece sahibinden.com ilan linkleri
 * - Boyut limiti: tek batch'te 200 item
 */
export const ListBatchSchema = z.object({
  items: z
    .array(
      z.object({
        url: z
          .string()
          .url()
          .max(500)
          .refine(
            (u) =>
              u.startsWith('https://www.sahibinden.com/ilan/') ||
              u.startsWith('https://sahibinden.com/ilan/'),
            'Sadece sahibinden ilan URL kabul edilir',
          ),
        baslik: z.string().min(1).max(300),
        fiyat: z.string().min(1).max(50),
      }),
    )
    .min(1)
    .max(200),
});
export type ListBatchInput = z.infer<typeof ListBatchSchema>;

/**
 * UGC ilan oluşturma (taslak). Kategori-duyarlı; kategoriye özel alanlar `ozellikler` jsonb'sinde.
 * Scraping yok → kaynak='user', kaynak_id/ilan_url server'da set/boş. Skor zorlanmaz (liste AI paneli yapar).
 */
export const CreateListingSchema = z.object({
  kategori: z.enum(['konut', 'arsa', 'oto']),
  baslik: z.string().trim().min(5).max(200),
  fiyat_tl: z.number().int().positive(),
  aciklama: z.string().max(8000).optional(),
  il: z.string().max(100).optional(),
  ilce: z.string().max(100).optional(),
  mahalle: z.string().max(100).optional(),
  net_m2: z.number().int().positive().optional(),
  oda_sayisi: z.string().max(20).optional(),
  bina_yasi: z.number().int().min(0).max(200).optional(),
  /** Kategoriye özel alanlar + iletişim (platform dışı) — esnek jsonb. */
  ozellikler: z.record(z.unknown()).optional(),
});
export type CreateListingInput = z.infer<typeof CreateListingSchema>;

/** Güncelleme — tüm alanlar opsiyonel (kategori değişmez). */
export const UpdateListingSchema = CreateListingSchema.partial().omit({ kategori: true });
export type UpdateListingInput = z.infer<typeof UpdateListingSchema>;

/** Yayınlama — telif/ToS beyanı zorunlu (dava-riski). */
export const PublishSchema = z.object({
  tos_attested: z.literal(true),
});
export type PublishInput = z.infer<typeof PublishSchema>;
