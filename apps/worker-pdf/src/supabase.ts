import { createDecipheriv } from 'node:crypto'
import { createServiceClient } from '@kavra/db'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) throw new Error('Supabase env eksik')

export const supabase = createServiceClient(url, serviceKey)

export async function verifyUserToken(authHeader?: string): Promise<string | null> {
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.slice(7)
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user) return null
  return data.user.id
}

function getMasterKey(): Buffer {
  const hex = process.env.MASTER_ENCRYPTION_KEY
  if (!hex) throw new Error('MASTER_ENCRYPTION_KEY eksik')
  const buf = Buffer.from(hex, 'hex')
  if (buf.length !== 32) throw new Error('MASTER_ENCRYPTION_KEY 32 byte olmalı')
  return buf
}

export function decryptApiKey(encrypted: Buffer, iv: Buffer, tag: Buffer): string {
  const key = getMasterKey()
  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
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
