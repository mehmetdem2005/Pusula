import { z } from 'zod';

export const VisionRequest = z.object({
  foto_urlleri: z.array(z.string().url()),
  ilan_attrs: z.object({
    balkon: z.boolean().optional(),
    asansor: z.boolean().optional(),
    site_icinde: z.boolean().optional(),
    oda_sayisi: z.string().optional(),
  }).optional(),
  trace_id: z.string().uuid(),
});
export type VisionRequest = z.infer<typeof VisionRequest>;

export const HiddenDefect = z.object({
  type: z.enum(['nem', 'catlak', 'kuf', 'boya_dokulmesi', 'diger']),
  confidence: z.number().min(0).max(1),
  location: z.enum(['duvar', 'tavan', 'zemin', 'pencere', 'diger']),
});

export const VisionResult = z.object({
  foto_count: z.number().int().min(0),
  ortalama_cozunurluk_mp: z.number().optional(),
  natural_light_score: z.number().min(0).max(100).optional(),
  scene_class: z.enum(['deniz', 'park', 'sokak', 'duvar', 'yok']).optional(),
  cleanliness_score: z.number().min(0).max(100).optional(),
  decoration_score: z.number().min(0).max(100).optional(),
  furniture_quality_score: z.number().min(0).max(100).optional(),
  hidden_defects: z.array(HiddenDefect),
  lens_distortion_detected: z.boolean(),
  perceived_room_size_inconsistency: z.boolean(),
  structural_inconsistencies: z.array(z.string()),
  notes: z.string().optional(),
});
export type VisionResult = z.infer<typeof VisionResult>;

export const VisionResponse = z.object({
  result: VisionResult,
  model_used: z.string(),
  cost_usd: z.number(),
  trace_id: z.string().uuid(),
});
export type VisionResponse = z.infer<typeof VisionResponse>;
