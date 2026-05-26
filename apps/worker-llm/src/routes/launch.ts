import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { supabase, verifyUserToken } from '../supabase.js'

/**
 * Launch Routes:
 *  - Account deletion (Apple/Google requirement)
 *  - In-app feedback collection
 *  - Announcement banners
 *  - Review prompt state
 */

const FeedbackSchema = z.object({
  feedbackType: z.enum(['bug', 'feature_request', 'rating', 'general', 'crash']),
  rating: z.number().int().min(1).max(5).optional(),
  message: z.string().min(1).max(2000),
  appVersion: z.string().max(20).optional(),
  platform: z.enum(['ios', 'android', 'web']).optional(),
  deviceId: z.string().max(200).optional(),
})

const DeleteAccountSchema = z.object({
  reason: z.string().max(500).optional(),
  confirmText: z.literal('HESABIMI SİL'), // explicit consent
})

const AnnouncementSchema = z.object({
  title: z.string().min(1).max(100),
  message: z.string().min(1).max(500),
  ctaLabel: z.string().max(50).optional(),
  ctaUrl: z.string().max(500).optional(),
  level: z.enum(['info', 'feature', 'maintenance', 'critical']).default('info'),
  targetUsers: z.enum(['all', 'free', 'pro', 'admin']).default('all'),
  targetPlatforms: z.array(z.enum(['ios', 'android', 'web'])).optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
})

export async function launchRoutes(fastify: FastifyInstance) {
  // ============ FEEDBACK ============

  /** POST /api/feedback */
  fastify.post('/api/feedback', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const parsed = FeedbackSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.format() })

    const { data, error } = await supabase
      .from('user_feedback')
      .insert({
        user_id: userId,
        feedback_type: parsed.data.feedbackType,
        rating: parsed.data.rating,
        message: parsed.data.message,
        app_version: parsed.data.appVersion,
        platform: parsed.data.platform,
        device_id: parsed.data.deviceId,
      })
      .select()
      .single()

    if (error) return reply.code(500).send({ error: error.message })
    return { feedback: data }
  })

  /** GET /api/feedback (admin) */
  fastify.get<{ Querystring: { status?: string } }>('/api/feedback', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
      return reply.code(403).send({ error: 'admin_only' })
    }

    let q = supabase
      .from('user_feedback')
      .select('*, profiles(email, full_name)')
      .order('created_at', { ascending: false })
      .limit(100)

    if (req.query.status) q = q.eq('status', req.query.status)

    const { data } = await q
    return { feedback: data ?? [] }
  })

  // ============ ACCOUNT DELETION ============

  /** POST /api/account/delete (14 günlük geri alınabilir silme) */
  fastify.post('/api/account/delete', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const parsed = DeleteAccountSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'Onay metni "HESABIMI SİL" olmalı',
        details: parsed.error.format(),
      })
    }

    // Pro abonelik aktifse uyar
    const { data: ent } = await supabase
      .from('user_entitlements')
      .select('is_pro, valid_until')
      .eq('user_id', userId)
      .single()

    if (ent?.is_pro && ent.valid_until && new Date(ent.valid_until) > new Date()) {
      return reply.code(400).send({
        error: 'active_subscription',
        message: 'Önce abonelik iptal edilmeli. App Store/Play Store ayarlarından iptal et.',
      })
    }

    // Schedule deletion
    const { data, error } = await supabase
      .from('account_deletion_requests')
      .upsert(
        {
          user_id: userId,
          reason: parsed.data.reason,
          scheduled_for: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'pending',
        },
        { onConflict: 'user_id' },
      )
      .select()
      .single()

    if (error) return reply.code(500).send({ error: error.message })

    return {
      message: 'Hesabın 14 gün içinde silinecek. Vazgeçmek için tekrar giriş yap.',
      scheduledFor: data.scheduled_for,
    }
  })

  /** POST /api/account/cancel-deletion */
  fastify.post('/api/account/cancel-deletion', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    await supabase
      .from('account_deletion_requests')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('status', 'pending')

    return { ok: true, message: 'Silme isteği iptal edildi.' }
  })

  /** GET /api/account/deletion-status */
  fastify.get('/api/account/deletion-status', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const { data } = await supabase
      .from('account_deletion_requests')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .single()

    return { request: data }
  })

  /** POST /api/account/export-data (GDPR — her şeyi indir) */
  fastify.post('/api/account/export-data', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    // Tüm kullanıcı verisini topla
    const tables = [
      'profiles',
      'subjects',
      'concepts',
      'reviews',
      'reflections',
      'notebooks',
      'notebook_sources',
      'notebook_messages',
      'generated_content',
      'books',
      'user_vocabulary',
      'vocabulary_srs',
      'exercise_sessions',
      'user_devices',
      'user_feedback',
    ]

    const exportData: Record<string, any> = {}
    for (const table of tables) {
      const { data } = await supabase.from(table).select('*').eq('user_id', userId)
      exportData[table] = data
    }

    // Profil dahil
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single()
    exportData.profile = profile

    return {
      exportedAt: new Date().toISOString(),
      userId,
      data: exportData,
    }
  })

  // ============ ANNOUNCEMENTS ============

  /** GET /api/announcements (kullanıcıya görünen) */
  fastify.get('/api/announcements', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    // Aktif duyurular
    const { data: announcements } = await supabase
      .from('announcements')
      .select('*')
      .eq('is_active', true)
      .lte('starts_at', new Date().toISOString())
      .order('created_at', { ascending: false })

    if (!announcements) return { announcements: [] }

    // Kullanıcının dismiss ettiği
    const { data: dismissals } = await supabase
      .from('user_announcement_state')
      .select('announcement_id')
      .eq('user_id', userId)

    const dismissedIds = new Set((dismissals ?? []).map((d) => d.announcement_id))

    // User entitlements
    const { data: ent } = await supabase
      .from('user_entitlements')
      .select('is_pro')
      .eq('user_id', userId)
      .single()

    const visible = announcements.filter((a) => {
      if (dismissedIds.has(a.id)) return false
      if (a.ends_at && new Date(a.ends_at) < new Date()) return false
      if (a.target_users === 'pro' && !ent?.is_pro) return false
      if (a.target_users === 'free' && ent?.is_pro) return false
      return true
    })

    return { announcements: visible }
  })

  /** POST /api/announcements/:id/dismiss */
  fastify.post<{ Params: { id: string }; Body: { clicked?: boolean } }>(
    '/api/announcements/:id/dismiss',
    async (req, reply) => {
      const userId = await verifyUserToken(req.headers.authorization)
      if (!userId) return reply.code(401).send({ error: 'unauthorized' })

      await supabase.from('user_announcement_state').upsert({
        user_id: userId,
        announcement_id: req.params.id,
        dismissed_at: new Date().toISOString(),
        clicked: req.body.clicked ?? false,
      })

      return { ok: true }
    },
  )

  /** POST /api/announcements (admin) */
  fastify.post('/api/announcements', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
      return reply.code(403).send({ error: 'admin_only' })
    }

    const parsed = AnnouncementSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.format() })

    const { data, error } = await supabase
      .from('announcements')
      .insert({
        title: parsed.data.title,
        message: parsed.data.message,
        cta_label: parsed.data.ctaLabel,
        cta_url: parsed.data.ctaUrl,
        level: parsed.data.level,
        target_users: parsed.data.targetUsers,
        target_platforms: parsed.data.targetPlatforms,
        starts_at: parsed.data.startsAt,
        ends_at: parsed.data.endsAt,
        created_by: userId,
      })
      .select()
      .single()

    if (error) return reply.code(500).send({ error: error.message })
    return { announcement: data }
  })

  // ============ REVIEW PROMPT ============

  /** GET /api/review-prompt/should-ask */
  fastify.get('/api/review-prompt/should-ask', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const { data: state } = await supabase
      .from('review_prompt_state')
      .select('*')
      .eq('user_id', userId)
      .single()

    // Daha önce review verdiyse veya retıt ettiyse sorma
    if (state?.has_reviewed || state?.declined_at) {
      return { shouldAsk: false }
    }

    // 7 günden önce sorma
    if (state?.last_prompted_at) {
      const daysSince =
        (Date.now() - new Date(state.last_prompted_at).getTime()) / (1000 * 60 * 60 * 24)
      if (daysSince < 30) return { shouldAsk: false }
    }

    // İlk eligible time geçmiş mi?
    if (state?.first_eligible_at && new Date(state.first_eligible_at) > new Date()) {
      return { shouldAsk: false }
    }

    // Kullanıcının yeterli "happy moment"ı var mı? (heuristik)
    // Bu projede: 5+ flashcard reviewed + 3+ chat message + Pro user
    const { count: reviewCount } = await supabase
      .from('vocabulary_review_log')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    const shouldAsk = (reviewCount ?? 0) >= 5

    return { shouldAsk }
  })

  /** POST /api/review-prompt/responded */
  fastify.post<{ Body: { response: 'reviewed' | 'declined' | 'later' } }>(
    '/api/review-prompt/responded',
    async (req, reply) => {
      const userId = await verifyUserToken(req.headers.authorization)
      if (!userId) return reply.code(401).send({ error: 'unauthorized' })

      const updates: any = { last_prompted_at: new Date().toISOString() }
      if (req.body.response === 'reviewed') updates.has_reviewed = true
      if (req.body.response === 'declined') updates.declined_at = new Date().toISOString()

      await supabase.from('review_prompt_state').upsert({ user_id: userId, ...updates })

      return { ok: true }
    },
  )
}
