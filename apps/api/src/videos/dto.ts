import { z } from 'zod';

/** AI video üretim isteği. prompt boşsa şablon/öntanım kullanılır. */
export const CreateVideoSchema = z.object({
  listing_id: z.string().uuid(),
  prompt: z.string().trim().max(500).optional(),
  template_id: z.string().max(50).optional(),
  /** Belirtilmezse ilanın hazır fotoğrafları kullanılır. */
  input_media_ids: z.array(z.string().uuid()).max(20).optional(),
});
export type CreateVideoInput = z.infer<typeof CreateVideoSchema>;
