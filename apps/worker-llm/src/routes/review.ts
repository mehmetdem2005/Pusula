import { applySM2 } from '@kavra/engine'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { supabase, verifyUserToken } from '../supabase.js'

const ReviewSchema = z.object({
  flashcardId: z.string().uuid(),
  quality: z.number().int().min(0).max(5),
  timeSpentMs: z.number().int().optional(),
})

export async function reviewRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/review/due — bugün/şu an çalışılması gereken kartlar
   */
  fastify.get<{ Querystring: { subjectId?: string; limit?: string } }>(
    '/api/review/due',
    async (req, reply) => {
      const userId = await verifyUserToken(req.headers.authorization)
      if (!userId) return reply.code(401).send({ error: 'unauthorized' })

      const { data, error } = await supabase.rpc('get_due_flashcards', {
        match_user_id: userId,
        match_subject_id: req.query.subjectId ?? null,
        match_limit: Math.min(100, Number(req.query.limit ?? 50)),
      })

      if (error) return reply.code(500).send({ error: error.message })
      return { cards: data ?? [] }
    },
  )

  /**
   * POST /api/review/grade — bir kart için kalite puanı, SM-2 uygula
   */
  fastify.post('/api/review/grade', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const parsed = ReviewSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.format() })
    const { flashcardId, quality, timeSpentMs } = parsed.data

    // Kart sahipliği + mevcut state
    const { data: card } = await supabase
      .from('flashcards')
      .select(
        'id, user_id, ease_factor, interval_days, repetitions, total_reviews, lapses, concept_id, subject_id',
      )
      .eq('id', flashcardId)
      .eq('user_id', userId)
      .single()
    if (!card) return reply.code(404).send({ error: 'not_found' })

    const result = applySM2(
      {
        easeFactor: Number(card.ease_factor ?? 2.5),
        intervalDays: card.interval_days ?? 0,
        repetitions: card.repetitions ?? 0,
      },
      quality,
    )

    // Kartı güncelle
    await supabase
      .from('flashcards')
      .update({
        ease_factor: result.easeFactor,
        interval_days: result.intervalDays,
        repetitions: result.repetitions,
        next_review_at: result.nextReviewAt.toISOString(),
        last_reviewed_at: new Date().toISOString(),
        total_reviews: (card.total_reviews ?? 0) + 1,
        lapses: (card.lapses ?? 0) + (result.isLapse ? 1 : 0),
      })
      .eq('id', flashcardId)

    // Review log
    await supabase.from('flashcard_reviews').insert({
      user_id: userId,
      flashcard_id: flashcardId,
      rating: quality,
      time_spent_ms: timeSpentMs ?? null,
      prev_ease_factor: Number(card.ease_factor ?? 2.5),
      prev_interval_days: card.interval_days ?? 0,
      prev_repetitions: card.repetitions ?? 0,
      new_ease_factor: result.easeFactor,
      new_interval_days: result.intervalDays,
      new_repetitions: result.repetitions,
      next_review_at: result.nextReviewAt.toISOString(),
    })

    // Lapse ise error_portfolio'ya kaydet
    if (result.isLapse) {
      const { data: cardFull } = await supabase
        .from('flashcards')
        .select('front, back')
        .eq('id', flashcardId)
        .single()

      if (cardFull) {
        await supabase.from('error_portfolio').insert({
          user_id: userId,
          concept_id: card.concept_id,
          subject_id: card.subject_id,
          source_type: 'flashcard',
          source_id: flashcardId,
          mistake_summary: `Flashcard hatası: "${cardFull.front.slice(0, 80)}"`,
          correct_answer: cardFull.back.slice(0, 200),
        })
      }
    }

    return {
      ok: true,
      newState: {
        easeFactor: result.easeFactor,
        intervalDays: result.intervalDays,
        repetitions: result.repetitions,
        nextReviewAt: result.nextReviewAt,
      },
      isLapse: result.isLapse,
    }
  })

  /**
   * GET /api/review/stats — bugün, bu hafta, toplam istatistikler
   */
  fastify.get('/api/review/stats', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)

    const [todayResp, weekResp, totalResp, dueResp] = await Promise.all([
      supabase
        .from('flashcard_reviews')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', today.toISOString()),
      supabase
        .from('flashcard_reviews')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', weekAgo.toISOString()),
      supabase.from('flashcards').select('*', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.rpc('get_due_flashcards', {
        match_user_id: userId,
        match_subject_id: null,
        match_limit: 1000,
      }),
    ])

    return {
      todayReviews: todayResp.count ?? 0,
      weekReviews: weekResp.count ?? 0,
      totalCards: totalResp.count ?? 0,
      dueNow: (dueResp.data ?? []).length,
    }
  })
}
