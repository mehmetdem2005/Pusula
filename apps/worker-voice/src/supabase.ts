import { createServiceClient } from '@kavra/db'
import { decryptApiKey } from './crypto.js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  throw new Error('Supabase env değişkenleri eksik')
}

export const supabase = createServiceClient(url, serviceKey)

export async function verifyUserToken(authHeader?: string): Promise<string | null> {
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.slice(7)
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user) return null
  return data.user.id
}

export async function getActiveGroqKey(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('api_keys')
    .select('key_encrypted, key_iv, key_tag')
    .eq('user_id', userId)
    .eq('provider', 'groq')
    .eq('is_default', true)
    .eq('is_active', true)
    .single()
  if (!data) return null
  return decryptApiKey(data.key_encrypted, data.key_iv, data.key_tag)
}
