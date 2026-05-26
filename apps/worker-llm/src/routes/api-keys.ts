import { AddApiKeySchema } from '@kavra/shared/schemas'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { decryptApiKey, encryptApiKey } from '../crypto.js'
import { groqTestKey } from '../groq.js'
import { supabase, verifyUserToken } from '../supabase.js'

export async function apiKeysRoutes(fastify: FastifyInstance) {
  // GET /api/keys — kullanıcının anahtarlarını listele (maskelenmiş)
  fastify.get('/api/keys', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const { data, error } = await supabase
      .from('api_keys')
      .select(
        'id, provider, label, key_last4, is_default, is_active, last_test_success, last_used_at, created_at',
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) return reply.code(500).send({ error: error.message })
    return { keys: data }
  })

  // POST /api/keys — yeni anahtar ekle
  fastify.post('/api/keys', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const parsed = AddApiKeySchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.format() })
    const { provider, label, key } = parsed.data

    // Önce key'i test et
    const works = provider === 'groq' ? await groqTestKey(key) : true
    if (!works) return reply.code(400).send({ error: 'invalid_key' })

    // Şifrele
    const { encrypted, iv, tag, last4 } = encryptApiKey(key)

    // Kayıtlı başka key yoksa varsayılan yap
    const { count } = await supabase
      .from('api_keys')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('provider', provider)

    const { data, error } = await supabase
      .from('api_keys')
      .insert({
        user_id: userId,
        provider,
        label,
        key_encrypted: encrypted,
        key_iv: iv,
        key_tag: tag,
        key_last4: last4,
        is_default: count === 0,
        last_test_success: true,
        last_test_at: new Date().toISOString(),
      })
      .select('id, provider, label, key_last4, is_default')
      .single()

    if (error) return reply.code(500).send({ error: error.message })
    return { key: data }
  })

  // DELETE /api/keys/:id
  fastify.delete<{ Params: { id: string } }>('/api/keys/:id', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const { error } = await supabase
      .from('api_keys')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', userId)

    if (error) return reply.code(500).send({ error: error.message })
    return { ok: true }
  })

  // POST /api/keys/:id/test
  fastify.post<{ Params: { id: string } }>('/api/keys/:id/test', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const { data, error } = await supabase
      .from('api_keys')
      .select('key_encrypted, key_iv, key_tag, provider')
      .eq('id', req.params.id)
      .eq('user_id', userId)
      .single()

    if (error || !data) return reply.code(404).send({ error: 'not_found' })

    const plain = decryptApiKey(data.key_encrypted, data.key_iv, data.key_tag)
    const works = data.provider === 'groq' ? await groqTestKey(plain) : true

    await supabase
      .from('api_keys')
      .update({ last_test_at: new Date().toISOString(), last_test_success: works })
      .eq('id', req.params.id)

    return { success: works }
  })

  // POST /api/keys/:id/default — varsayılan yap
  fastify.post<{ Params: { id: string } }>('/api/keys/:id/default', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const { data: target } = await supabase
      .from('api_keys')
      .select('provider')
      .eq('id', req.params.id)
      .eq('user_id', userId)
      .single()

    if (!target) return reply.code(404).send({ error: 'not_found' })

    // Eskisi false
    await supabase
      .from('api_keys')
      .update({ is_default: false })
      .eq('user_id', userId)
      .eq('provider', target.provider)

    // Yenisi true
    await supabase.from('api_keys').update({ is_default: true }).eq('id', req.params.id)

    return { ok: true }
  })
}

/** Kullanıcının varsayılan Groq key'ini decrypt edip döndürür */
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
