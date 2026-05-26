import type { FastifyInstance } from 'fastify'
import { groqListModels } from '../groq.js'
import { supabase, verifyUserToken } from '../supabase.js'
import { getActiveGroqKey } from './api-keys.js'

function inferCategory(modelId: string): string {
  const id = modelId.toLowerCase()
  if (id.includes('whisper')) return 'stt'
  if (id.includes('scout') || id.includes('maverick') || id.includes('vision')) return 'vision'
  if (id.includes('r1') || id.includes('reasoning') || id.includes('gpt-oss-120b'))
    return 'reasoning'
  if (id.includes('compound')) return 'compound'
  if (id.includes('guard') || id.includes('safeguard')) return 'safety'
  if (id.includes('8b') || id.includes('instant')) return 'fast'
  return 'versatile'
}

function inferRecommended(modelId: string): boolean {
  const id = modelId.toLowerCase()
  return (
    id.includes('llama-3.3-70b-versatile') ||
    id.includes('llama-3.1-8b-instant') ||
    id.includes('scout-17b')
  )
}

async function syncModelsToDb(apiKey: string): Promise<number> {
  const models = await groqListModels(apiKey)
  let count = 0

  for (const m of models) {
    const category = inferCategory(m.id)
    await supabase.from('llm_models').upsert(
      {
        provider: 'groq',
        model_id: m.id,
        display_name: m.id.replace(/^(meta-llama|openai)\//, ''),
        context_window: m.context_window ?? null,
        category,
        is_recommended: inferRecommended(m.id),
        is_active: m.active !== false,
        last_synced_at: new Date().toISOString(),
      },
      { onConflict: 'provider,model_id' },
    )
    count++
  }

  return count
}

export async function modelsRoutes(fastify: FastifyInstance) {
  // GET /api/models
  // DB boşsa kullanıcının key'iyle otomatik ilk sync yapar
  fastify.get('/api/models', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    // Önce DB'den dene
    let { data, error } = await supabase
      .from('llm_models')
      .select('*')
      .eq('is_active', true)
      .eq('provider', 'groq')
      .order('is_recommended', { ascending: false })

    // DB boşsa user key'iyle otomatik sync
    if (!error && (!data || data.length === 0)) {
      const userKey = await getActiveGroqKey(userId)
      if (userKey) {
        try {
          await syncModelsToDb(userKey)
          const { data: refreshed } = await supabase
            .from('llm_models')
            .select('*')
            .eq('is_active', true)
            .eq('provider', 'groq')
            .order('is_recommended', { ascending: false })
          data = refreshed
        } catch (e) {
          fastify.log.warn({ err: e }, 'Auto-sync failed')
        }
      }
    }

    if (error) return reply.code(500).send({ error: error.message })
    return { models: data ?? [] }
  })

  // POST /api/models/sync — manuel sync (admin veya user key'iyle)
  fastify.post('/api/models/sync', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    // Önce admin key dene, yoksa user key
    let key = process.env.GROQ_ADMIN_KEY
    if (!key) {
      key = (await getActiveGroqKey(userId)) ?? undefined
    }
    if (!key) {
      return reply.code(400).send({
        error: 'no_key',
        message: 'Önce bir Groq anahtarı ekle, sonra modelleri senkronize edebilirsin.',
      })
    }

    try {
      const count = await syncModelsToDb(key)
      return { synced: count }
    } catch (err: any) {
      return reply.code(500).send({ error: err.message })
    }
  })
}
