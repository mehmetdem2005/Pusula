import { z } from 'zod';
import { UserPersona } from './common.js';

export const MarketingFormat = z.enum([
  'ilan_aciklama',
  'instagram_post',
  'instagram_story',
  'whatsapp_musteri',
  'email_musteri',
  'linkedin_post',
]);
export type MarketingFormat = z.infer<typeof MarketingFormat>;

export const MarketingTone = z.enum(['profesyonel', 'enerjik', 'samimi']);
export type MarketingTone = z.infer<typeof MarketingTone>;

export const MarketingRequest = z.object({
  ilan_id: z.string().uuid(),
  format: MarketingFormat,
  tone: MarketingTone.default('profesyonel'),
  length: z.enum(['kisa', 'orta', 'uzun']).default('orta'),
  persona: UserPersona.default('agent_seller'),
  include_hashtags: z.boolean().default(true),
  trace_id: z.string().uuid(),
});
export type MarketingRequest = z.infer<typeof MarketingRequest>;

export const MarketingResponse = z.object({
  metin: z.string(),
  variants: z.array(z.string()).default([]),
  hashtags: z.array(z.string()).default([]),
  llm_cost_usd: z.number(),
  trace_id: z.string().uuid(),
});
export type MarketingResponse = z.infer<typeof MarketingResponse>;
