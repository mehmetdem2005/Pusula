import { z } from 'zod';
import { Provider } from './llm.js';

export const UserRole = z.enum(['individual', 'agent', 'dealer', 'admin']);
export type UserRole = z.infer<typeof UserRole>;

export const User = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  display_name: z.string().optional(),
  role: UserRole.default('individual'),
  created_at: z.string().datetime(),
});
export type User = z.infer<typeof User>;

/**
 * Client-side BYOK key (saklanan format, AES-GCM şifreli).
 */
export const EncryptedProviderKey = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  provider: Provider,
  /** Base64-encoded ciphertext (AES-GCM 256). Server zero-knowledge. */
  encrypted_key: z.string(),
  /** Base64-encoded IV (96-bit). */
  iv: z.string(),
  key_label: z.string().optional(),
  is_active: z.boolean().default(true),
  created_at: z.string().datetime(),
  last_used_at: z.string().datetime().optional(),
});
export type EncryptedProviderKey = z.infer<typeof EncryptedProviderKey>;

export const UsageEvent = z.object({
  id: z.string(),
  user_id: z.string().uuid(),
  provider: Provider,
  model: z.string(),
  task_type: z.string(),
  input_tokens: z.number().int().min(0),
  output_tokens: z.number().int().min(0),
  cost_usd: z.number().min(0),
  key_source: z.enum(['user_byok', 'platform_pool']),
  latency_ms: z.number().int().min(0),
  created_at: z.string().datetime(),
});
export type UsageEvent = z.infer<typeof UsageEvent>;
