import { z } from 'zod';

export const NLPRequest = z.object({
  baslik: z.string(),
  aciklama: z.string().optional(),
  ilan_id: z.string().uuid().optional(),
  ilan_veren_id: z.string().optional(),
  trace_id: z.string().uuid(),
});
export type NLPRequest = z.infer<typeof NLPRequest>;

export const NLPResult = z.object({
  misleading_word_density: z.number().min(0).max(100),
  missing_info_signals: z.array(z.string()),
  language_error_index: z.number().min(0).max(100).optional(),
  copy_paste_flag: z.boolean(),
  tonality_score: z.number().min(-100).max(100),
  hidden_features: z.array(z.string()),
  suspicion_lexicon_hits: z.array(z.string()),
});
export type NLPResult = z.infer<typeof NLPResult>;

export const NLPResponse = z.object({
  result: NLPResult,
  model_used: z.string(),
  trace_id: z.string().uuid(),
});
export type NLPResponse = z.infer<typeof NLPResponse>;
