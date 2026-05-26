import { TeachingEngine } from '@kavra/engine'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { supabase, verifyUserToken } from '../supabase.js'

const OutcomeSchema = z.object({
  lessonId: z.string().uuid(),
  userRating: z.number().int().min(1).max(5).optional(),
  completed: z.boolean().default(true),
  quizPerformance: z.number().min(0).max(1).optional(),
})

export async function engineRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/engine/outcome
   * Ders sonunda kullanıcı rating verince / ders kapatınca çağrılır.
   * Bandit arm'larını günceller.
   */
  fastify.post('/api/engine/outcome', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const parsed = OutcomeSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.format() })

    const { lessonId, userRating, completed, quizPerformance } = parsed.data

    // Ders detayları + teknik ID
    const { data: lesson } = await supabase
      .from('lessons')
      .select('id, user_id, technique_id, started_at')
      .eq('id', lessonId)
      .eq('user_id', userId)
      .single()

    if (!lesson) return reply.code(404).send({ error: 'lesson_not_found' })
    if (!lesson.technique_id) {
      return reply
        .code(400)
        .send({ error: 'no_technique', message: 'Ders henüz tekniğe bağlanmamış' })
    }

    // Mesaj sayısı ve süre
    const { count: messageCount } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('lesson_id', lessonId)

    const duration = Math.floor((Date.now() - new Date(lesson.started_at).getTime()) / 1000)

    // Lesson kaydını güncelle
    await supabase
      .from('lessons')
      .update({
        user_rating: userRating ?? null,
        status: completed ? 'completed' : 'abandoned',
        completed_at: new Date().toISOString(),
      })
      .eq('id', lessonId)

    // Engine'e feedback
    const engine = new TeachingEngine(supabase)
    await engine.recordOutcome({
      lessonId,
      userId,
      techniqueId: lesson.technique_id,
      userRating,
      duration,
      messageCount: messageCount ?? 0,
      completed,
      quizPerformance,
    })

    return { ok: true }
  })

  /**
   * GET /api/engine/decision/:lessonId
   * Bir dersin engine kararını oku — UI "Feynman tekniğiyle anlattım" gösterebilsin.
   */
  fastify.get<{ Params: { lessonId: string } }>(
    '/api/engine/decision/:lessonId',
    async (req, reply) => {
      const userId = await verifyUserToken(req.headers.authorization)
      if (!userId) return reply.code(401).send({ error: 'unauthorized' })

      const { data } = await supabase
        .from('engine_decisions')
        .select(`
          *,
          techniques:selected_technique_id(id, code, name)
        `)
        .eq('lesson_id', req.params.lessonId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      return { decision: data }
    },
  )

  /**
   * POST /api/concepts/:id/embed
   * Concept'i embed'le — ileriki RAG çağrılarında kullanılsın.
   * Yeni concept oluşturulunca ya da update edildiğinde mobile tarafından çağrılır.
   */
  fastify.post<{ Params: { id: string } }>('/api/concepts/:id/embed', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const openaiKey = process.env.OPENAI_API_KEY
    if (!openaiKey) return reply.code(500).send({ error: 'openai_not_configured' })

    // RLS zaten doğru concept'i getirecek
    const { data: concept } = await supabase
      .from('concepts')
      .select('id, name, description, subject_id')
      .eq('id', req.params.id)
      .single()

    if (!concept) return reply.code(404).send({ error: 'not_found' })

    // Sahipliği kontrol et
    const { data: subject } = await supabase
      .from('subjects')
      .select('user_id')
      .eq('id', concept.subject_id)
      .single()

    if (subject?.user_id !== userId) {
      return reply.code(403).send({ error: 'forbidden' })
    }

    const text = `${concept.name}\n\n${concept.description ?? ''}`.trim()

    try {
      const res = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: text,
        }),
      })

      if (!res.ok) throw new Error(`Embed: ${res.status}`)
      const json: any = await res.json()
      const embedding = json.data[0].embedding

      await supabase
        .from('concepts')
        .update({ embedding: embedding as any })
        .eq('id', concept.id)

      return { ok: true, dimensions: embedding.length }
    } catch (err: any) {
      return reply.code(500).send({ error: 'embed_failed', detail: err.message })
    }
  })
}
