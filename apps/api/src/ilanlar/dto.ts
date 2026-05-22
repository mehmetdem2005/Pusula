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
