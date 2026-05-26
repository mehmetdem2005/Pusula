import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { supabase, verifyUserToken } from '../supabase.js'

const FocusStartSchema = z.object({
  type: z.enum(['pomodoro', 'deep_work', 'review_block']),
  plannedMinutes: z.number().int().min(5).max(180),
  subjectId: z.string().uuid().optional(),
})

const FocusCompleteSchema = z.object({
  focusId: z.string().uuid(),
  actualMinutes: z.number().int().min(1),
  completed: z.boolean().default(true),
  interruptedCount: z.number().int().default(0),
  notes: z.string().max(500).optional(),
})

const GoalSchema = z.object({
  subjectId: z.string().uuid().optional(),
  wish: z.string().min(3).max(200),
  outcome: z.string().min(3).max(300),
  obstacle: z.string().max(300).optional(),
  plan: z.string().max(500).optional(),
  targetDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
})

const PushTokenSchema = z.object({
  token: z.string().min(10),
  deviceInfo: z.record(z.string(), z.any()).optional(),
})

export async function motivationRoutes(fastify: FastifyInstance) {
  // ==================== ACHIEVEMENTS ====================

  /** GET /api/achievements — preset + earned hepsi */
  fastify.get('/api/achievements', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const [allResp, earnedResp] = await Promise.all([
      supabase.from('achievements').select('*').eq('is_active', true).order('display_order'),
      supabase.from('user_achievements').select('*').eq('user_id', userId),
    ])

    const earnedIds = new Set((earnedResp.data ?? []).map((u: any) => u.achievement_id))
    const earnedDates = new Map(
      (earnedResp.data ?? []).map((u: any) => [u.achievement_id, u.earned_at]),
    )

    const all = (allResp.data ?? []).map((a: any) => ({
      ...a,
      earned: earnedIds.has(a.id),
      earned_at: earnedDates.get(a.id) ?? null,
    }))

    return {
      achievements: all,
      earnedCount: earnedIds.size,
      totalCount: all.length,
    }
  })

  /** POST /api/achievements/check — yeni rozet kazanıldı mı kontrol et */
  fastify.post('/api/achievements/check', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const { data } = await supabase.rpc('check_achievements', { p_user_id: userId })

    // Yeni kazanılan rozetlerin detaylarını döndür
    const newIds = (data ?? []).map((r: any) => r.achievement_id)
    if (newIds.length === 0) return { newAchievements: [] }

    const { data: details } = await supabase.from('achievements').select('*').in('id', newIds)

    return { newAchievements: details ?? [] }
  })

  // ==================== STREAK ====================

  /** GET /api/streak — current streak ve longest */
  fastify.get('/api/streak', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const { data } = await supabase.from('streaks').select('*').eq('user_id', userId).maybeSingle()

    return {
      currentStreak: data?.current_streak ?? 0,
      longestStreak: data?.longest_streak ?? 0,
      lastActivityDate: data?.last_activity_date,
    }
  })

  // ==================== FOCUS SESSIONS ====================

  /** POST /api/focus/start — Pomodoro/deep work başlat */
  fastify.post('/api/focus/start', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const parsed = FocusStartSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.format() })

    const { data, error } = await supabase
      .from('focus_sessions')
      .insert({
        user_id: userId,
        type: parsed.data.type,
        planned_duration_minutes: parsed.data.plannedMinutes,
        subject_id: parsed.data.subjectId ?? null,
      })
      .select()
      .single()
    if (error) return reply.code(500).send({ error: error.message })
    return { focusId: data.id }
  })

  /** POST /api/focus/complete — bitir */
  fastify.post('/api/focus/complete', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const parsed = FocusCompleteSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.format() })

    const { error } = await supabase
      .from('focus_sessions')
      .update({
        actual_duration_minutes: parsed.data.actualMinutes,
        completed: parsed.data.completed,
        interrupted_count: parsed.data.interruptedCount,
        notes: parsed.data.notes ?? null,
        completed_at: new Date().toISOString(),
      })
      .eq('id', parsed.data.focusId)
      .eq('user_id', userId)

    if (error) return reply.code(500).send({ error: error.message })

    // Achievement kontrolü — pomodoro_5
    await supabase.rpc('check_achievements', { p_user_id: userId })

    return { ok: true }
  })

  /** GET /api/focus/today — bugünkü focus oturumları */
  fastify.get('/api/focus/today', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const { data } = await supabase
      .from('focus_sessions')
      .select('*')
      .eq('user_id', userId)
      .gte('started_at', today.toISOString())
      .order('started_at', { ascending: false })

    const totalMinutes = (data ?? [])
      .filter((s: any) => s.completed)
      .reduce((sum: number, s: any) => sum + (s.actual_duration_minutes ?? 0), 0)

    return { sessions: data ?? [], totalMinutes }
  })

  // ==================== GOALS (WOOP) ====================

  /** GET /api/goals — aktif hedefler */
  fastify.get('/api/goals', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const { data } = await supabase
      .from('goals')
      .select('*, subjects(name, icon)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    return { goals: data ?? [] }
  })

  /** POST /api/goals — yeni WOOP hedefi */
  fastify.post('/api/goals', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const parsed = GoalSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.format() })

    const { data, error } = await supabase
      .from('goals')
      .insert({
        user_id: userId,
        subject_id: parsed.data.subjectId ?? null,
        wish: parsed.data.wish,
        outcome: parsed.data.outcome,
        obstacle: parsed.data.obstacle ?? null,
        plan: parsed.data.plan ?? null,
        target_date: parsed.data.targetDate ?? null,
      })
      .select()
      .single()

    if (error) return reply.code(500).send({ error: error.message })
    return { goal: data }
  })

  /** POST /api/goals/:id/complete */
  fastify.post<{ Params: { id: string } }>('/api/goals/:id/complete', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    await supabase
      .from('goals')
      .update({ completed: true, completed_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('user_id', userId)

    return { ok: true }
  })

  // ==================== PUSH TOKENS ====================

  /** POST /api/push/register — Expo push token kaydet */
  fastify.post('/api/push/register', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const parsed = PushTokenSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.format() })

    const { error } = await supabase.from('push_tokens').upsert(
      {
        user_id: userId,
        token: parsed.data.token,
        device_info: parsed.data.deviceInfo ?? null,
        is_active: true,
        last_used_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,token' },
    )

    if (error) return reply.code(500).send({ error: error.message })
    return { ok: true }
  })

  /** DELETE /api/push/token — abonelikten çık */
  fastify.delete<{ Body: { token: string } }>('/api/push/token', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const { token } = req.body
    if (!token) return reply.code(400).send({ error: 'token_required' })

    await supabase
      .from('push_tokens')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('token', token)

    return { ok: true }
  })

  /**
   * POST /api/push/send-review-reminder — manuel test
   * (Cron için ayrı bir scheduler gerekecek)
   */
  fastify.post('/api/push/send-review-reminder', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    // Due flashcard sayısını al
    const { data: dueCards } = await supabase.rpc('get_due_flashcards', {
      match_user_id: userId,
      match_subject_id: null,
      match_limit: 1,
    })
    const dueCount = (dueCards ?? []).length

    if (dueCount === 0) return { skipped: true, reason: 'no_due_cards' }

    // Aktif token'ları al
    const { data: tokens } = await supabase
      .from('push_tokens')
      .select('token')
      .eq('user_id', userId)
      .eq('is_active', true)

    if (!tokens || tokens.length === 0) return { skipped: true, reason: 'no_tokens' }

    // Expo Push API
    const messages = tokens.map((t: any) => ({
      to: t.token,
      sound: 'default',
      title: '🔁 Tekrar zamanı',
      body: `${dueCount} kart seni bekliyor`,
      data: { type: 'review_reminder' },
    }))

    try {
      const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(messages),
      })
      const json = await res.json()
      return { sent: tokens.length, response: json }
    } catch (err: any) {
      return reply.code(500).send({ error: 'push_failed', message: err.message })
    }
  })
}
