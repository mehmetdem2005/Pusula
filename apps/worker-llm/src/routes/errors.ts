import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { groqChatJSON } from '../groq.js'
import { getActiveGroqKey, supabase, verifyUserToken } from '../supabase.js'

const FiveWhysSchema = z.object({
  errorId: z.string().uuid(),
})

const ResolveSchema = z.object({
  errorId: z.string().uuid(),
  resolutionLessonId: z.string().uuid().optional(),
})

export async function errorsRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/errors — kullanıcının çözülmemiş hataları
   */
  fastify.get<{ Querystring: { subjectId?: string; conceptId?: string } }>(
    '/api/errors',
    async (req, reply) => {
      const userId = await verifyUserToken(req.headers.authorization)
      if (!userId) return reply.code(401).send({ error: 'unauthorized' })

      let q = supabase
        .from('error_portfolio')
        .select('*')
        .eq('user_id', userId)
        .eq('resolved', false)
        .order('created_at', { ascending: false })
        .limit(50)

      if (req.query.subjectId) q = q.eq('subject_id', req.query.subjectId)
      if (req.query.conceptId) q = q.eq('concept_id', req.query.conceptId)

      const { data, error } = await q
      if (error) return reply.code(500).send({ error: error.message })
      return { errors: data ?? [] }
    },
  )

  /**
   * POST /api/errors/five-whys — bir hata için kök neden analizi
   */
  fastify.post('/api/errors/five-whys', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const parsed = FiveWhysSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.format() })

    const apiKey = await getActiveGroqKey(userId)
    if (!apiKey) return reply.code(400).send({ error: 'no_active_key' })

    const { data: err } = await supabase
      .from('error_portfolio')
      .select('*, concepts(name, description)')
      .eq('id', parsed.data.errorId)
      .eq('user_id', userId)
      .single()

    if (!err) return reply.code(404).send({ error: 'not_found' })

    try {
      const result = await groqChatJSON<{
        root_causes: string[]
        suggested_action: string
        connected_concepts: string[]
      }>({
        apiKey,
        jsonMode: true,
        temperature: 0.4,
        systemPrompt: `Sen pedagojik bir hata analisti olarak çalışıyorsun. Verilen öğrenci hatasını
"5 Neden" tekniğiyle analiz et — yüzeydeki yanlıştan kök kavramsal eksiğe in.

Çıktı JSON:
{
  "root_causes": [
    "1. Neden — yüzey hata",
    "2. Neden — bunun altındaki anlama eksiği",
    "3. Neden — daha derin kavram karışıklığı",
    "4. Neden — temel önkoşul eksikliği",
    "5. Neden — zihinsel modelin kaynaklı sorunu"
  ],
  "suggested_action": "Bu hatayı kalıcı çözmek için bir cümlelik öneri",
  "connected_concepts": ["Bu hatayla ilgili tekrar gözden geçirilmesi gereken kavramlar"]
}

Türkçe ve samimi yaz. Yargılayıcı değil, açıklayıcı ol.`,
        userPrompt: `Hata bilgisi:
- Kavram: ${(err as any).concepts?.name ?? 'Bilinmiyor'}
- Kavram açıklaması: ${(err as any).concepts?.description ?? '-'}
- Öğrencinin cevabı: ${err.user_answer ?? '-'}
- Doğru cevap: ${err.correct_answer ?? '-'}
- Hata özeti: ${err.mistake_summary}`,
      })

      // Root causes'ı kaydet
      await supabase
        .from('error_portfolio')
        .update({ root_causes: result })
        .eq('id', parsed.data.errorId)

      return result
    } catch (err: any) {
      fastify.log.error(err)
      return reply.code(500).send({ error: 'analysis_failed', message: err.message })
    }
  })

  /**
   * POST /api/errors/resolve — hata çözüldü işaretle
   */
  fastify.post('/api/errors/resolve', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const parsed = ResolveSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.format() })

    const { error } = await supabase
      .from('error_portfolio')
      .update({
        resolved: true,
        resolved_at: new Date().toISOString(),
        resolution_lesson_id: parsed.data.resolutionLessonId ?? null,
      })
      .eq('id', parsed.data.errorId)
      .eq('user_id', userId)

    if (error) return reply.code(500).send({ error: error.message })
    return { ok: true }
  })

  /**
   * GET /api/subjects/:id/stats — subject için tam istatistik
   */
  fastify.get<{ Params: { id: string } }>('/api/subjects/:id/stats', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const { data, error } = await supabase.rpc('get_subject_stats', {
      match_user_id: userId,
      match_subject_id: req.params.id,
    })

    if (error) return reply.code(500).send({ error: error.message })
    return { stats: data?.[0] ?? null }
  })
}
