import { z } from 'zod';

export const UploadUrlSchema = z.object({
  listing_id: z.string().uuid(),
  type: z.enum(['photo', 'video']),
  content_type: z.string().min(3).max(100),
  bytes: z.number().int().positive(),
});
export type UploadUrlInput = z.infer<typeof UploadUrlSchema>;

export const CompleteSchema = z.object({
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  duration_ms: z.number().int().positive().optional(),
  bytes: z.number().int().positive().optional(),
  poster_path: z.string().max(500).optional(),
});
export type CompleteInput = z.infer<typeof CompleteSchema>;
