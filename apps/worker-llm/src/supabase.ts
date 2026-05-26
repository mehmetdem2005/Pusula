import { createServiceClient } from '@kavra/db'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  throw new Error('Supabase env değişkenleri eksik')
}

export const supabase = createServiceClient(url, serviceKey)

/** JWT doğrula, userId döndür */
export async function verifyUserToken(authHeader?: string): Promise<string | null> {
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.slice(7)
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user) return null
  return data.user.id
}

export { getActiveGroqKey } from './routes/api-keys.js'
