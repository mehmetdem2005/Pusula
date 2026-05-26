import type { FastifyInstance } from 'fastify'
import { groqListModels } from '../groq.js'
import { supabase, verifyUserToken } from '../supabase.js'

// Model kategorisini adından çıkar
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

export async function modelsRoutes(fastify: FastifyInstance) {
  // GET /api/models — aktif modelleri döndür
  fastify.get('/api/models', async (req, reply) => {
    const { data, error } = await supabase
      .from('llm_models')
      .select('*')
      .eq('is_active', true)
      .order('is_recommended', { ascending: false })

    if (error) return reply.code(500).send({ error: error.message })
    return { models: data }
  })

  // POST /api/models/sync — admin endpoint, Groq'tan modelleri çek
  fastify.post('/api/models/sync', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    // Admin kontrolü
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()
    if (profile?.role !== 'admin') return reply.code(403).send({ error: 'forbidden' })

    const adminKey = process.env.GROQ_ADMIN_KEY
    if (!adminKey) return reply.code(500).send({ error: 'no_admin_key' })

    try {
      const models = await groqListModels(adminKey)
      let count = 0

      for (const m of models) {
        const category = inferCategory(m.id)
        await supabase.from('llm_models').upsert(
          {
            provider: 'groq',
            model_id: m.id,
            display_name: m.id,
            context_window: m.context_window ?? null,
            category,
            is_active: m.active !== false,
            last_synced_at: new Date().toISOString(),
          },
          { onConflict: 'provider,model_id' },
        )
        count++
      }

      return { synced: count }
    } catch (err: any) {
      return reply.code(500).send({ error: err.message })
    }
  })
}
