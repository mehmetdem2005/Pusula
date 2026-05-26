import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import {
  DEFAULT_PARAMS,
  type FSRSCard,
  type Rating,
  type State,
  newCard,
  previewIntervals,
  retrievability,
  scheduleCard,
} from '../lib/fsrs.js'
import { supabase, verifyUserToken } from '../supabase.js'

/**
 * Vocabulary Review Routes — FSRS-5 bazlı kelime tekrarı
 * =======================================================
 *
 * GET  /api/vocab-review/due           — Bugün tekrar edilecek kartlar
 * GET  /api/vocab-review/queue         — Yeni + due karışık queue
 * POST /api/vocab-review/:cardId/rate  — Bir kartı puanla
 * GET  /api/vocab-review/stats         — Heatmap + retention oranı
 */

const RateCardSchema = z.object({
  rating: z.number().int().min(1).max(4),
  durationMs: z.number().int().nonnegative().optional(),
})

interface DBVocabSRS {
  id: string
  user_id: string
  vocabulary_id: string
  difficulty: number
  stability: number
  retrievability: number | null
  state: State
  step: number
  due_at: string
  last_review_at: string | null
  reps: number
  lapses: number
  card_type: string
}

function dbToFSRS(row: DBVocabSRS): FSRSCard {
  return {
    difficulty: row.difficulty,
    stability: row.stability,
    retrievability: row.retrievability ?? 1,
    state: row.state,
    step: row.step,
    due: new Date(row.due_at),
    lastReview: row.last_review_at ? new Date(row.last_review_at) : null,
    reps: row.reps,
    lapses: row.lapses,
  }
}

export async function vocabReviewRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/vocab-review/due — bugün/şu an tekrar edilecekler
   */
  fastify.get<{ Querystring: { lang?: string; limit?: string } }>(
    '/api/vocab-review/due',
    async (req, reply) => {
      const userId = await verifyUserToken(req.headers.authorization)
      if (!userId) return reply.code(401).send({ error: 'unauthorized' })

      const limit = Math.min(Number.parseInt(req.query.limit ?? '50'), 200)

      let q = supabase
        .from('vocabulary_srs')
        .select(`
          id, vocabulary_id, difficulty, stability, retrievability, state,
          step, due_at, last_review_at, reps, lapses, card_type,
          user_vocabulary!inner (
            id, word, language, ipa, definitions, translations,
            source_sentence, encounters
          )
        `)
        .eq('user_id', userId)
        .lte('due_at', new Date().toISOString())
        .neq('state', 'new')
        .order('due_at', { ascending: true })
        .limit(limit)

      if (req.query.lang) {
        q = q.eq('user_vocabulary.language', req.query.lang)
      }

      const { data } = await q
      return { cards: data ?? [], count: data?.length ?? 0 }
    },
  )

  /**
   * GET /api/vocab-review/queue
   * Mixed: 80% due (review/relearning), 20% new (yeni kelimeler).
   * Linga'nın "Mixed exercise"i için.
   */
  fastify.get<{ Querystring: { lang?: string; limit?: string; newRatio?: string } }>(
    '/api/vocab-review/queue',
    async (req, reply) => {
      const userId = await verifyUserToken(req.headers.authorization)
      if (!userId) return reply.code(401).send({ error: 'unauthorized' })

      const limit = Math.min(Number.parseInt(req.query.limit ?? '20'), 100)
      const newRatio = Math.min(Math.max(Number.parseFloat(req.query.newRatio ?? '0.2'), 0), 1)
      const newCount = Math.floor(limit * newRatio)
      const dueCount = limit - newCount

      // Due cards
      const { data: dueCards } = await supabase
        .from('vocabulary_srs')
        .select(`*, user_vocabulary!inner(*)`)
        .eq('user_id', userId)
        .lte('due_at', new Date().toISOString())
        .neq('state', 'new')
        .order('due_at', { ascending: true })
        .limit(dueCount)

      // New vocabulary (no card yet)
      let newQ = supabase
        .from('user_vocabulary')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'learning')
        .not('id', 'in', `(SELECT vocabulary_id FROM vocabulary_srs WHERE user_id = '${userId}')`)
        .order('added_at', { ascending: false })
        .limit(newCount)

      if (req.query.lang) newQ = newQ.eq('language', req.query.lang)

      const { data: newVocab } = await newQ

      // Auto-create SRS cards for new vocab
      const newCards = []
      for (const v of newVocab ?? []) {
        const { data: created } = await supabase
          .from('vocabulary_srs')
          .insert({
            user_id: userId,
            vocabulary_id: v.id,
            card_type: 'recognition',
          })
          .select()
          .single()

        if (created) {
          newCards.push({ ...created, user_vocabulary: v })
        }
      }

      // Mix and shuffle
      const all = [...(dueCards ?? []), ...newCards]
      for (let i = all.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[all[i], all[j]] = [all[j]!, all[i]!]
      }

      return { cards: all, dueCount: dueCards?.length ?? 0, newCount: newCards.length }
    },
  )

  /**
   * POST /api/vocab-review/:cardId/rate
   */
  fastify.post<{ Params: { cardId: string } }>(
    '/api/vocab-review/:cardId/rate',
    async (req, reply) => {
      const userId = await verifyUserToken(req.headers.authorization)
      if (!userId) return reply.code(401).send({ error: 'unauthorized' })

      const parsed = RateCardSchema.safeParse(req.body)
      if (!parsed.success) return reply.code(400).send({ error: parsed.error.format() })

      const { rating, durationMs } = parsed.data

      // Mevcut kartı al
      const { data: card } = await supabase
        .from('vocabulary_srs')
        .select('*')
        .eq('id', req.params.cardId)
        .eq('user_id', userId)
        .single()

      if (!card) return reply.code(404).send({ error: 'not_found' })

      // FSRS parametreleri
      const { data: paramsRow } = await supabase
        .from('user_fsrs_params')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()

      const params = paramsRow
        ? {
            ...DEFAULT_PARAMS,
            w: paramsRow.parameters,
            requestRetention: paramsRow.request_retention,
            maximumInterval: paramsRow.maximum_interval,
            enableShortTerm: paramsRow.enable_short_term,
          }
        : DEFAULT_PARAMS

      const cardObj = dbToFSRS(card as DBVocabSRS)
      const r = retrievability(cardObj)
      const next = scheduleCard(cardObj, rating as Rating, new Date(), params)

      // DB güncelle
      await supabase
        .from('vocabulary_srs')
        .update({
          difficulty: next.difficulty,
          stability: next.stability,
          retrievability: next.retrievability,
          state: next.state,
          step: next.step,
          due_at: next.due.toISOString(),
          last_review_at: next.lastReview?.toISOString() ?? null,
          reps: next.reps,
          lapses: next.lapses,
          updated_at: new Date().toISOString(),
        })
        .eq('id', req.params.cardId)

      // Vocabulary status güncelle (mastered/reviewing/learning)
      let newStatus = 'learning'
      if (next.reps >= 3 && next.stability >= 21) newStatus = 'mastered'
      else if (next.reps >= 1) newStatus = 'reviewing'

      await supabase
        .from('user_vocabulary')
        .update({ status: newStatus, last_seen_at: new Date().toISOString() })
        .eq('id', card.vocabulary_id)

      // Review log
      await supabase.from('vocabulary_review_log').insert({
        user_id: userId,
        vocab_srs_id: card.id,
        rating,
        duration_ms: durationMs,
        difficulty_before: card.difficulty,
        stability_before: card.stability,
        retrievability_before: r,
        difficulty_after: next.difficulty,
        stability_after: next.stability,
      })

      // Daily progress
      const today = new Date().toISOString().split('T')[0]
      await supabase.from('vocabulary_daily_progress').upsert(
        {
          user_id: userId,
          date: today,
          words_reviewed: 1,
        },
        { onConflict: 'user_id,date', ignoreDuplicates: false },
      )

      return {
        ok: true,
        nextDue: next.due.toISOString(),
        intervalDays: Math.round((next.due.getTime() - Date.now()) / 86400000),
        state: next.state,
        newStatus,
      }
    },
  )

  /**
   * GET /api/vocab-review/preview/:cardId
   * 4 button önizlemesi
   */
  fastify.get<{ Params: { cardId: string } }>(
    '/api/vocab-review/preview/:cardId',
    async (req, reply) => {
      const userId = await verifyUserToken(req.headers.authorization)
      if (!userId) return reply.code(401).send({ error: 'unauthorized' })

      const { data: card } = await supabase
        .from('vocabulary_srs')
        .select('*')
        .eq('id', req.params.cardId)
        .eq('user_id', userId)
        .single()

      if (!card) return reply.code(404).send({ error: 'not_found' })

      const cardObj = dbToFSRS(card as DBVocabSRS)
      const intervals = previewIntervals(cardObj)

      return { intervals }
    },
  )

  /**
   * GET /api/vocab-review/stats
   */
  fastify.get('/api/vocab-review/stats', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const [{ count: totalCards }, { count: dueCards }, { count: masteredCount }] =
      await Promise.all([
        supabase
          .from('vocabulary_srs')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId),
        supabase
          .from('vocabulary_srs')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .lte('due_at', new Date().toISOString())
          .neq('state', 'new'),
        supabase
          .from('user_vocabulary')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('status', 'mastered'),
      ])

    // Last 30 days reviews heatmap
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString()
    const { data: recent } = await supabase
      .from('vocabulary_review_log')
      .select('reviewed_at, rating')
      .eq('user_id', userId)
      .gte('reviewed_at', thirtyDaysAgo)

    const heatmap: Record<string, { count: number; correct: number }> = {}
    for (const log of recent ?? []) {
      const day = log.reviewed_at.split('T')[0]
      if (!heatmap[day]) heatmap[day] = { count: 0, correct: 0 }
      heatmap[day].count++
      if (log.rating >= 3) heatmap[day].correct++
    }

    const total = recent?.length ?? 0
    const correct = (recent ?? []).filter((r) => r.rating >= 3).length
    const retentionRate = total > 0 ? correct / total : 0

    return {
      totalCards: totalCards ?? 0,
      dueCards: dueCards ?? 0,
      masteredWords: masteredCount ?? 0,
      retentionRate,
      reviewsLast30Days: total,
      heatmap,
    }
  })
}
