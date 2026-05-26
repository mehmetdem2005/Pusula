import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { supabase, verifyUserToken } from '../supabase.js'

/**
 * Admin Routes — Kavra Yönetim Paneli
 * ====================================
 *
 * Tüm bu route'lar `is_admin()` ya da `is_super_admin()` kontrolü gerektirir.
 * Super admin: rol değiştirme, kullanıcı silme, ban
 * Admin: PDF yükleme, kullanıcı görme, ders ekleme
 */

const PromoteUserSchema = z.object({
  userId: z.string().uuid(),
  newRole: z.enum(['user', 'admin', 'super_admin']),
})

const BanUserSchema = z.object({
  userId: z.string().uuid(),
  reason: z.string().min(3).max(500),
})

const UploadLibrarySchema = z.object({
  title: z.string().min(1).max(200),
  author: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
  category: z.enum(['textbook', 'novel', 'reference', 'exam_prep', 'other']),
  language: z.string().default('tr'),
  subjectTags: z.array(z.string()).default([]),
  isProOnly: z.boolean().default(false),
  storagePath: z.string(), // pre-uploaded
  fileSize: z.number().int().positive(),
  pageCount: z.number().int().positive().optional(),
  coverImageUrl: z.string().url().optional(),
})

async function requireAdmin(token: string | undefined): Promise<{
  ok: boolean
  userId?: string
  role?: string
  error?: string
}> {
  const userId = await verifyUserToken(token)
  if (!userId) return { ok: false, error: 'unauthorized' }

  const { data } = await supabase
    .from('profiles')
    .select('role, banned_at')
    .eq('id', userId)
    .single()

  if (!data) return { ok: false, error: 'profile_not_found' }
  if (data.banned_at) return { ok: false, error: 'banned' }
  if (!['admin', 'super_admin'].includes(data.role)) {
    return { ok: false, error: 'forbidden' }
  }

  return { ok: true, userId, role: data.role }
}

async function logAudit(
  adminUserId: string,
  action: string,
  targetType: string | null,
  targetId: string | null,
  metadata: Record<string, unknown> = {},
  ip?: string,
): Promise<void> {
  await supabase.from('admin_audit_logs').insert({
    admin_user_id: adminUserId,
    action,
    target_type: targetType,
    target_id: targetId,
    metadata,
    ip_address: ip,
  })
}

export async function adminRoutes(fastify: FastifyInstance) {
  // ============ DASHBOARD ============

  /** GET /api/admin/dashboard — özet istatistikler */
  fastify.get('/api/admin/dashboard', async (req, reply) => {
    const auth = await requireAdmin(req.headers.authorization)
    if (!auth.ok) return reply.code(403).send({ error: auth.error })

    const [users, lessons, pdfs, library, subscriptions] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('lessons').select('*', { count: 'exact', head: true }),
      supabase.from('documents').select('*', { count: 'exact', head: true }),
      supabase.from('library_documents').select('*', { count: 'exact', head: true }),
      supabase.from('subscriptions').select('tier, status', { count: 'exact', head: false }),
    ])

    // Son 7 günde yeni kullanıcı
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { count: newUsersWeek } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', weekAgo)

    const proCount = (subscriptions.data ?? []).filter(
      (s: any) =>
        ['pro_monthly', 'pro_yearly', 'pro_lifetime'].includes(s.tier) && s.status === 'active',
    ).length

    return {
      users: {
        total: users.count ?? 0,
        newThisWeek: newUsersWeek ?? 0,
        proCount,
      },
      content: {
        userPdfs: pdfs.count ?? 0,
        libraryBooks: library.count ?? 0,
        totalLessons: lessons.count ?? 0,
      },
    }
  })

  // ============ USER MANAGEMENT ============

  /** GET /api/admin/users — kullanıcı listesi */
  fastify.get<{ Querystring: { search?: string; limit?: string; offset?: string; role?: string } }>(
    '/api/admin/users',
    async (req, reply) => {
      const auth = await requireAdmin(req.headers.authorization)
      if (!auth.ok) return reply.code(403).send({ error: auth.error })

      const limit = Math.min(Number.parseInt(req.query.limit ?? '50'), 100)
      const offset = Number.parseInt(req.query.offset ?? '0')

      let query = supabase
        .from('profiles')
        .select(
          `
          id, email, full_name, role, banned_at, created_at,
          phone_number, phone_verified_at, auth_providers,
          subscriptions(tier, status, current_period_end)
        `,
          { count: 'exact' },
        )
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (req.query.search) {
        query = query.or(`email.ilike.%${req.query.search}%,full_name.ilike.%${req.query.search}%`)
      }
      if (req.query.role) {
        query = query.eq('role', req.query.role)
      }

      const { data, count, error } = await query
      if (error) return reply.code(500).send({ error: error.message })

      return { users: data ?? [], total: count ?? 0, limit, offset }
    },
  )

  /** GET /api/admin/users/:id — tek kullanıcı detay */
  fastify.get<{ Params: { id: string } }>('/api/admin/users/:id', async (req, reply) => {
    const auth = await requireAdmin(req.headers.authorization)
    if (!auth.ok) return reply.code(403).send({ error: auth.error })

    const { data: profile } = await supabase
      .from('profiles')
      .select('*, subscriptions(*)')
      .eq('id', req.params.id)
      .single()

    if (!profile) return reply.code(404).send({ error: 'not_found' })

    const [lessons, subjects, documents, streaks] = await Promise.all([
      supabase
        .from('lessons')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', req.params.id),
      supabase
        .from('subjects')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', req.params.id),
      supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', req.params.id),
      supabase
        .from('streaks')
        .select('current_streak, longest_streak')
        .eq('user_id', req.params.id)
        .maybeSingle(),
    ])

    return {
      profile,
      stats: {
        totalLessons: lessons.count ?? 0,
        totalSubjects: subjects.count ?? 0,
        totalPdfs: documents.count ?? 0,
        currentStreak: streaks.data?.current_streak ?? 0,
        longestStreak: streaks.data?.longest_streak ?? 0,
      },
    }
  })

  /** POST /api/admin/users/promote — rol değiştir (sadece super_admin) */
  fastify.post('/api/admin/users/promote', async (req, reply) => {
    const auth = await requireAdmin(req.headers.authorization)
    if (!auth.ok) return reply.code(403).send({ error: auth.error })
    if (auth.role !== 'super_admin') {
      return reply.code(403).send({ error: 'super_admin_only' })
    }

    const parsed = PromoteUserSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.format() })

    const { error } = await supabase
      .from('profiles')
      .update({ role: parsed.data.newRole })
      .eq('id', parsed.data.userId)

    if (error) return reply.code(500).send({ error: error.message })

    await logAudit(
      auth.userId!,
      'user_role_changed',
      'user',
      parsed.data.userId,
      {
        newRole: parsed.data.newRole,
      },
      req.ip,
    )

    return { ok: true }
  })

  /** POST /api/admin/users/ban */
  fastify.post('/api/admin/users/ban', async (req, reply) => {
    const auth = await requireAdmin(req.headers.authorization)
    if (!auth.ok) return reply.code(403).send({ error: auth.error })
    if (auth.role !== 'super_admin') {
      return reply.code(403).send({ error: 'super_admin_only' })
    }

    const parsed = BanUserSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.format() })

    await supabase
      .from('profiles')
      .update({
        banned_at: new Date().toISOString(),
        ban_reason: parsed.data.reason,
      })
      .eq('id', parsed.data.userId)

    await logAudit(
      auth.userId!,
      'user_banned',
      'user',
      parsed.data.userId,
      {
        reason: parsed.data.reason,
      },
      req.ip,
    )

    return { ok: true }
  })

  /** POST /api/admin/users/unban */
  fastify.post<{ Body: { userId: string } }>('/api/admin/users/unban', async (req, reply) => {
    const auth = await requireAdmin(req.headers.authorization)
    if (!auth.ok || auth.role !== 'super_admin') {
      return reply.code(403).send({ error: 'super_admin_only' })
    }

    await supabase
      .from('profiles')
      .update({ banned_at: null, ban_reason: null })
      .eq('id', req.body.userId)

    await logAudit(auth.userId!, 'user_unbanned', 'user', req.body.userId, {}, req.ip)

    return { ok: true }
  })

  // ============ LIBRARY (PDF/Kitap kütüphanesi) ============

  /** POST /api/admin/library/upload-url — PDF yükleme için signed URL */
  fastify.post('/api/admin/library/upload-url', async (req, reply) => {
    const auth = await requireAdmin(req.headers.authorization)
    if (!auth.ok) return reply.code(403).send({ error: auth.error })

    const fileName = `${Date.now()}-${crypto.randomUUID()}.pdf`
    const { data, error } = await supabase.storage.from('library').createSignedUploadUrl(fileName)

    if (error) return reply.code(500).send({ error: error.message })

    return {
      uploadUrl: data.signedUrl,
      storagePath: fileName,
      token: data.token,
    }
  })

  /** POST /api/admin/library — kitap meta kaydı */
  fastify.post('/api/admin/library', async (req, reply) => {
    const auth = await requireAdmin(req.headers.authorization)
    if (!auth.ok) return reply.code(403).send({ error: auth.error })

    const parsed = UploadLibrarySchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.format() })

    const { error, data } = await supabase
      .from('library_documents')
      .insert({
        title: parsed.data.title,
        author: parsed.data.author,
        description: parsed.data.description,
        cover_image_url: parsed.data.coverImageUrl,
        file_path: parsed.data.storagePath,
        file_size_bytes: parsed.data.fileSize,
        page_count: parsed.data.pageCount,
        language: parsed.data.language,
        category: parsed.data.category,
        subject_tags: parsed.data.subjectTags,
        is_pro_only: parsed.data.isProOnly,
        uploaded_by: auth.userId,
      })
      .select()
      .single()

    if (error) return reply.code(500).send({ error: error.message })

    await logAudit(
      auth.userId!,
      'library_uploaded',
      'document',
      data.id,
      {
        title: data.title,
        isProOnly: data.is_pro_only,
      },
      req.ip,
    )

    return { document: data }
  })

  /** GET /api/admin/library — admin kütüphanesi (admin görünümü) */
  fastify.get('/api/admin/library', async (req, reply) => {
    const auth = await requireAdmin(req.headers.authorization)
    if (!auth.ok) return reply.code(403).send({ error: auth.error })

    const { data } = await supabase
      .from('library_documents')
      .select('*, profiles!library_documents_uploaded_by_fkey(email, full_name)')
      .order('created_at', { ascending: false })

    return { documents: data ?? [] }
  })

  /** DELETE /api/admin/library/:id */
  fastify.delete<{ Params: { id: string } }>('/api/admin/library/:id', async (req, reply) => {
    const auth = await requireAdmin(req.headers.authorization)
    if (!auth.ok) return reply.code(403).send({ error: auth.error })

    const { data: doc } = await supabase
      .from('library_documents')
      .select('file_path, title')
      .eq('id', req.params.id)
      .single()

    if (doc) {
      await supabase.storage.from('library').remove([doc.file_path])
      await supabase.from('library_documents').delete().eq('id', req.params.id)
      await logAudit(
        auth.userId!,
        'library_deleted',
        'document',
        req.params.id,
        {
          title: doc.title,
        },
        req.ip,
      )
    }

    return { ok: true }
  })

  // ============ SUGGESTED SUBJECTS (önerilen konular) ============

  /** POST /api/admin/suggested-subjects — yeni öneri ekle */
  fastify.post('/api/admin/suggested-subjects', async (req, reply) => {
    const auth = await requireAdmin(req.headers.authorization)
    if (!auth.ok) return reply.code(403).send({ error: auth.error })

    const schema = z.object({
      name: z.string().min(1).max(100),
      description: z.string().max(500).optional(),
      emoji: z.string().max(10).optional(),
      iconName: z.string().max(50).optional(),
      color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
      category: z.string(),
      isFeatured: z.boolean().default(false),
    })

    const parsed = schema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.format() })

    const { data, error } = await supabase
      .from('suggested_subjects')
      .insert({
        name: parsed.data.name,
        description: parsed.data.description,
        emoji: parsed.data.emoji,
        icon_name: parsed.data.iconName,
        color: parsed.data.color,
        category: parsed.data.category,
        is_featured: parsed.data.isFeatured,
        created_by: auth.userId,
      })
      .select()
      .single()

    if (error) return reply.code(500).send({ error: error.message })

    await logAudit(auth.userId!, 'suggested_subject_added', 'subject', data.id, parsed.data, req.ip)
    return { subject: data }
  })

  // ============ AUDIT LOG ============

  /** GET /api/admin/audit — son aksiyonlar */
  fastify.get<{ Querystring: { limit?: string } }>('/api/admin/audit', async (req, reply) => {
    const auth = await requireAdmin(req.headers.authorization)
    if (!auth.ok) return reply.code(403).send({ error: auth.error })

    const limit = Math.min(Number.parseInt(req.query.limit ?? '100'), 500)

    const { data } = await supabase
      .from('admin_audit_logs')
      .select('*, profiles!admin_audit_logs_admin_user_id_fkey(email, full_name)')
      .order('created_at', { ascending: false })
      .limit(limit)

    return { logs: data ?? [] }
  })
}
