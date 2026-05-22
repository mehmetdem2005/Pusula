import { z } from 'zod';

/**
 * Liste sayfasından batch ingest payload'ı.
 * - URL allowlist: sadece sahibinden.com ilan linkleri
 * - Boyut limiti: tek batch'te 200 item
 * - String alanlar uzunluk limiti
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
 * "İlan yapıştır" / eklenti serbest-metin ingest payload'ı.
 * Sunucu LLM ile alanları çıkarır → skorlar. Sunucu hiçbir siteye istek atmaz (ban yok).
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
