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
