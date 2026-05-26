import crypto from 'crypto'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { AUDIT_EVENTS, audit } from '../lib/audit.js'
import { supabase, verifyUserToken } from '../supabase.js'

const CreateOrgSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().regex(/^[a-z0-9-]{2,50}$/),
  orgType: z
    .enum(['school', 'university', 'company', 'tutoring', 'public_sector', 'nonprofit'])
    .default('school'),
  billingEmail: z.string().email(),
  taxId: z.string().max(20).optional(),
})

const UpdateOrgSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  logoUrl: z.string().url().optional(),
  website: z.string().url().optional(),
  billingEmail: z.string().email().optional(),
  features: z.record(z.string(), z.any()).optional(),
})

const InviteSchema = z.object({
  emails: z.array(z.string().email()).min(1).max(100),
  role: z.enum(['admin', 'teacher', 'member', 'student']).default('member'),
  classId: z.string().uuid().optional(),
})

async function checkOrgRole(
  userId: string,
  orgId: string,
  allowedRoles: string[],
): Promise<boolean> {
  const { data } = await supabase
    .from('organization_members')
    .select('role')
    .eq('org_id', orgId)
    .eq('user_id', userId)
    .single()
  return !!data && allowedRoles.includes(data.role)
}

export async function organizationsRoutes(fastify: FastifyInstance) {
  /** POST /api/orgs */
  fastify.post('/api/orgs', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const parsed = CreateOrgSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.format() })

    // Slug unique
    const { data: existing } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', parsed.data.slug)
      .maybeSingle()
    if (existing) return reply.code(400).send({ error: 'slug_taken' })

    // Trial 14 gün
    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)

    const { data: org, error } = await supabase
      .from('organizations')
      .insert({
        name: parsed.data.name,
        slug: parsed.data.slug,
        org_type: parsed.data.orgType,
        billing_email: parsed.data.billingEmail,
        tax_id: parsed.data.taxId,
        plan: 'team',
        max_seats: 10,
        subscription_status: 'trialing',
        trial_ends_at: trialEndsAt.toISOString(),
        created_by: userId,
      })
      .select()
      .single()

    if (error) return reply.code(500).send({ error: error.message })

    // Founder otomatik owner
    await supabase.from('organization_members').insert({
      org_id: org.id,
      user_id: userId,
      role: 'owner',
      invitation_status: 'accepted',
    })

    await audit({
      orgId: org.id,
      userId,
      eventType: AUDIT_EVENTS.ORG_CREATED,
      eventCategory: 'org',
      targetType: 'organization',
      targetId: org.id,
      afterState: { name: org.name, plan: org.plan },
    })

    return { org }
  })

  /** GET /api/orgs (kullanıcının orgları) */
  fastify.get('/api/orgs', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const { data } = await supabase
      .from('organization_members')
      .select(`
        role, joined_at, invitation_status,
        organizations(id, name, slug, logo_url, plan, seats_used, max_seats, subscription_status, trial_ends_at)
      `)
      .eq('user_id', userId)
      .eq('invitation_status', 'accepted')

    return { orgs: data ?? [] }
  })

  /** GET /api/orgs/:slug */
  fastify.get<{ Params: { slug: string } }>('/api/orgs/:slug', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const { data: org } = await supabase
      .from('organizations')
      .select('*')
      .eq('slug', req.params.slug)
      .single()

    if (!org) return reply.code(404).send({ error: 'not_found' })

    const { data: member } = await supabase
      .from('organization_members')
      .select('role')
      .eq('org_id', org.id)
      .eq('user_id', userId)
      .single()

    if (!member) return reply.code(403).send({ error: 'not_member' })

    // Stats
    const [{ count: memberCount }, { count: classCount }] = await Promise.all([
      supabase
        .from('organization_members')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', org.id)
        .eq('invitation_status', 'accepted'),
      supabase
        .from('classes')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', org.id)
        .eq('is_archived', false),
    ])

    return {
      org,
      myRole: member.role,
      stats: { memberCount, classCount },
    }
  })

  /** PATCH /api/orgs/:id */
  fastify.patch<{ Params: { id: string } }>('/api/orgs/:id', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const isOwner = await checkOrgRole(userId, req.params.id, ['owner', 'admin'])
    if (!isOwner) return reply.code(403).send({ error: 'forbidden' })

    const parsed = UpdateOrgSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.format() })

    const { data: before } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', req.params.id)
      .single()

    const update: any = {}
    if (parsed.data.name) update.name = parsed.data.name
    if (parsed.data.logoUrl) update.logo_url = parsed.data.logoUrl
    if (parsed.data.website) update.website = parsed.data.website
    if (parsed.data.billingEmail) update.billing_email = parsed.data.billingEmail
    if (parsed.data.features) update.features = parsed.data.features

    const { data: updated, error } = await supabase
      .from('organizations')
      .update(update)
      .eq('id', req.params.id)
      .select()
      .single()

    if (error) return reply.code(500).send({ error: error.message })

    await audit({
      orgId: req.params.id,
      userId,
      eventType: AUDIT_EVENTS.ORG_SETTINGS_CHANGED,
      eventCategory: 'org',
      targetType: 'organization',
      targetId: req.params.id,
      beforeState: before,
      afterState: updated,
    })

    return { org: updated }
  })

  /** GET /api/orgs/:id/members */
  fastify.get<{ Params: { id: string } }>('/api/orgs/:id/members', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const isMember = await checkOrgRole(userId, req.params.id, [
      'owner',
      'admin',
      'teacher',
      'member',
      'student',
    ])
    if (!isMember) return reply.code(403).send({ error: 'forbidden' })

    const { data } = await supabase
      .from('organization_members')
      .select(`
          id, role, joined_at, invitation_status, last_active_at, expires_at,
          profiles(id, username, full_name, email, avatar_url)
        `)
      .eq('org_id', req.params.id)
      .order('joined_at', { ascending: false })

    return { members: data ?? [] }
  })

  /** POST /api/orgs/:id/invites — toplu davet */
  fastify.post<{ Params: { id: string } }>('/api/orgs/:id/invites', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const isAdmin = await checkOrgRole(userId, req.params.id, ['owner', 'admin'])
    if (!isAdmin) return reply.code(403).send({ error: 'forbidden' })

    const parsed = InviteSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.format() })

    // Seat check
    const { data: org } = await supabase
      .from('organizations')
      .select('seats_used, max_seats, slug')
      .eq('id', req.params.id)
      .single()

    if (!org) return reply.code(404).send({ error: 'org_not_found' })

    const willUse = parsed.data.emails.length
    if (org.seats_used + willUse > org.max_seats) {
      return reply.code(400).send({
        error: 'insufficient_seats',
        message: `${willUse} davet için yer yok. Kullanılan: ${org.seats_used}/${org.max_seats}`,
      })
    }

    // Her email için davet kaydı
    const invitations: any[] = []
    for (const email of parsed.data.emails) {
      const token = crypto.randomBytes(24).toString('hex')

      // User var mı? — direkt member yap
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle()

      if (existingProfile) {
        await supabase.from('organization_members').upsert(
          {
            org_id: req.params.id,
            user_id: existingProfile.id,
            role: parsed.data.role,
            invited_by: userId,
            invitation_email: email,
            invitation_status: 'accepted', // mevcut user direkt katılır
          },
          { onConflict: 'org_id,user_id' },
        )

        // Class atama
        if (parsed.data.classId) {
          await supabase.from('class_members').upsert(
            {
              class_id: parsed.data.classId,
              user_id: existingProfile.id,
              role: parsed.data.role === 'teacher' ? 'co_teacher' : 'student',
            },
            { onConflict: 'class_id,user_id' },
          )
        }

        invitations.push({ email, status: 'auto_added', userId: existingProfile.id })
      } else {
        // Pending invitation (email gönderilecek)
        await Promise.resolve(
          supabase.from('organization_members').insert({
            org_id: req.params.id,
            user_id: null as any, // henüz user yok
            role: parsed.data.role,
            invitation_token: token,
            invitation_email: email,
            invitation_status: 'pending',
            invited_by: userId,
          } as any),
        )
          .then(() => {})
          .catch(() => {})

        invitations.push({
          email,
          status: 'invited',
          inviteUrl: `https://kavra.app/invite/${token}`,
        })
      }

      await audit({
        orgId: req.params.id,
        userId,
        eventType: AUDIT_EVENTS.USER_INVITED,
        eventCategory: 'user',
        targetType: 'user',
        metadata: { email, role: parsed.data.role },
      })
    }

    // Recompute seats
    await supabase.rpc('recompute_org_seats', { p_org_id: req.params.id })

    // TODO: Email gönder (SendGrid/Resend) — pending invitations için
    // worker-cron'da hourly job

    return { invitations }
  })

  /** DELETE /api/orgs/:id/members/:memberId */
  fastify.delete<{ Params: { id: string; memberId: string } }>(
    '/api/orgs/:id/members/:memberId',
    async (req, reply) => {
      const userId = await verifyUserToken(req.headers.authorization)
      if (!userId) return reply.code(401).send({ error: 'unauthorized' })

      const isAdmin = await checkOrgRole(userId, req.params.id, ['owner', 'admin'])
      if (!isAdmin) return reply.code(403).send({ error: 'forbidden' })

      const { data: removed } = await supabase
        .from('organization_members')
        .select('user_id, role, invitation_email')
        .eq('id', req.params.memberId)
        .single()

      if (!removed) return reply.code(404).send({ error: 'member_not_found' })

      // Owner silinemez (en az 1 owner kalmalı)
      if (removed.role === 'owner') {
        const { count } = await supabase
          .from('organization_members')
          .select('*', { count: 'exact', head: true })
          .eq('org_id', req.params.id)
          .eq('role', 'owner')

        if ((count ?? 0) <= 1) {
          return reply.code(400).send({ error: 'last_owner', message: 'En son owner silinemez' })
        }
      }

      await supabase.from('organization_members').delete().eq('id', req.params.memberId)

      // Org-bound entitlement temizle
      if (removed.user_id) {
        await supabase
          .from('user_entitlements')
          .update({ is_pro: false, tier: 'free', org_id: null })
          .eq('user_id', removed.user_id)
          .eq('org_id', req.params.id)
      }

      await supabase.rpc('recompute_org_seats', { p_org_id: req.params.id })

      await audit({
        orgId: req.params.id,
        userId,
        eventType: AUDIT_EVENTS.USER_REMOVED,
        eventCategory: 'user',
        targetType: 'user',
        targetId: removed.user_id,
        metadata: { email: removed.invitation_email, role: removed.role },
      })

      return { ok: true }
    },
  )
}
