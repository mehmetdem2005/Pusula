import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { AUDIT_EVENTS, audit } from '../lib/audit.js'
import { supabase, verifyUserToken } from '../supabase.js'

/**
 * B2B Billing — Stripe Checkout (B2B subscription)
 * ==================================================
 *
 * Plan tiers:
 *   - team        $4/seat/ay     min 5 seat — küçük kurslar
 *   - business    $7/seat/ay     min 20 seat — okullar
 *   - enterprise  Custom          50+ seat — üniversiteler, özel SSO/SCIM/Audit gereken kurumlar
 *
 * Akış:
 *   1. Owner /orgs/:slug/billing'de plan + seat seçer
 *   2. POST /api/orgs/:id/checkout → Stripe Checkout Session URL döner
 *   3. Kullanıcı Stripe sayfasında öder
 *   4. Stripe webhook → org subscription_status='active', max_seats güncellenir
 *   5. Trial başlamış mı? trial_ends_at önce bitse de bedava 14 gün
 */

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY
const APP_URL = process.env.APP_URL ?? 'https://kavra.app'

const PRICE_IDS: Record<string, string> = {
  team_monthly: process.env.STRIPE_PRICE_TEAM_MONTHLY ?? 'price_team_m',
  team_yearly: process.env.STRIPE_PRICE_TEAM_YEARLY ?? 'price_team_y',
  business_monthly: process.env.STRIPE_PRICE_BUSINESS_MONTHLY ?? 'price_business_m',
  business_yearly: process.env.STRIPE_PRICE_BUSINESS_YEARLY ?? 'price_business_y',
}

const CheckoutSchema = z.object({
  plan: z.enum(['team', 'business']),
  billingCycle: z.enum(['monthly', 'yearly']),
  seatCount: z.number().int().min(5).max(10000),
})

const AuditQuerySchema = z.object({
  category: z.string().optional(),
  eventType: z.string().optional(),
  userId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.number().int().min(1).max(500).optional().default(100),
})

async function checkOrgOwner(userId: string, orgId: string): Promise<boolean> {
  const { data } = await supabase
    .from('organization_members')
    .select('role')
    .eq('org_id', orgId)
    .eq('user_id', userId)
    .single()
  return !!data && data.role === 'owner'
}

export async function b2bBillingRoutes(fastify: FastifyInstance) {
  /** POST /api/orgs/:id/checkout */
  fastify.post<{ Params: { id: string } }>('/api/orgs/:id/checkout', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    if (!(await checkOrgOwner(userId, req.params.id))) {
      return reply.code(403).send({ error: 'must_be_owner' })
    }

    const parsed = CheckoutSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.format() })

    // Min seat kontrol
    const minSeats = parsed.data.plan === 'team' ? 5 : 20
    if (parsed.data.seatCount < minSeats) {
      return reply.code(400).send({
        error: 'min_seats',
        message: `${parsed.data.plan} planı en az ${minSeats} seat gerektirir`,
      })
    }

    const priceId = PRICE_IDS[`${parsed.data.plan}_${parsed.data.billingCycle}`]
    if (!priceId || !STRIPE_SECRET_KEY) {
      return reply.code(500).send({ error: 'stripe_not_configured' })
    }

    const { data: org } = await supabase
      .from('organizations')
      .select('billing_email, stripe_customer_id, slug, name')
      .eq('id', req.params.id)
      .single()

    if (!org) return reply.code(404).send({ error: 'org_not_found' })

    // Stripe Checkout Session oluştur
    const params = new URLSearchParams({
      mode: 'subscription',
      success_url: `${APP_URL}/orgs/${org.slug}/billing?success=1`,
      cancel_url: `${APP_URL}/orgs/${org.slug}/billing?cancelled=1`,
      'line_items[0][price]': priceId,
      'line_items[0][quantity]': String(parsed.data.seatCount),
      'metadata[org_id]': req.params.id,
      'metadata[plan]': parsed.data.plan,
      'metadata[seat_count]': String(parsed.data.seatCount),
      client_reference_id: req.params.id,
    })

    if (org.stripe_customer_id) {
      params.append('customer', org.stripe_customer_id)
    } else {
      params.append('customer_email', org.billing_email ?? '')
    }

    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })

    if (!res.ok) {
      const err = await res.text()
      return reply.code(500).send({ error: 'stripe_failed', details: err })
    }

    const session: any = await res.json()
    return { checkoutUrl: session.url, sessionId: session.id }
  })

  /** POST /api/orgs/:id/portal — Stripe Customer Portal (abonelik yönetim) */
  fastify.post<{ Params: { id: string } }>('/api/orgs/:id/portal', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    if (!(await checkOrgOwner(userId, req.params.id))) {
      return reply.code(403).send({ error: 'must_be_owner' })
    }

    const { data: org } = await supabase
      .from('organizations')
      .select('stripe_customer_id, slug')
      .eq('id', req.params.id)
      .single()

    if (!org?.stripe_customer_id) {
      return reply.code(400).send({ error: 'no_subscription' })
    }

    if (!STRIPE_SECRET_KEY) return reply.code(500).send({ error: 'stripe_not_configured' })

    const params = new URLSearchParams({
      customer: org.stripe_customer_id,
      return_url: `${APP_URL}/orgs/${org.slug}/billing`,
    })

    const res = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })

    const session: any = await res.json()
    return { portalUrl: session.url }
  })

  /** POST /api/orgs/:id/contact-sales (enterprise) */
  fastify.post<{ Params: { id: string }; Body: { message: string; seatEstimate?: number } }>(
    '/api/orgs/:id/contact-sales',
    async (req, reply) => {
      const userId = await verifyUserToken(req.headers.authorization)
      if (!userId) return reply.code(401).send({ error: 'unauthorized' })

      const { data: org } = await supabase
        .from('organizations')
        .select('name, billing_email, slug')
        .eq('id', req.params.id)
        .single()

      // sales@kavra.app'e email tetikle (cron worker ile)
      // Şimdilik audit log + dahili notify
      await audit({
        orgId: req.params.id,
        userId,
        eventType: 'org.sales_contact',
        eventCategory: 'billing',
        metadata: {
          message: req.body.message,
          seatEstimate: req.body.seatEstimate,
          orgName: org?.name,
          email: org?.billing_email,
        },
      })

      return { ok: true, message: 'Satış ekibi 24 saat içinde dönecek.' }
    },
  )

  // ============== AUDIT LOG ==============

  /** GET /api/orgs/:id/audit */
  fastify.get<{ Params: { id: string }; Querystring: any }>(
    '/api/orgs/:id/audit',
    async (req, reply) => {
      const userId = await verifyUserToken(req.headers.authorization)
      if (!userId) return reply.code(401).send({ error: 'unauthorized' })

      // Owner/admin only
      const { data: member } = await supabase
        .from('organization_members')
        .select('role')
        .eq('org_id', req.params.id)
        .eq('user_id', userId)
        .single()

      if (!member || !['owner', 'admin'].includes(member.role)) {
        return reply.code(403).send({ error: 'forbidden' })
      }

      const queryParams = req.query as Record<string, string | undefined>
      const parsed = AuditQuerySchema.safeParse({
        ...queryParams,
        limit: queryParams.limit ? Number.parseInt(queryParams.limit) : undefined,
      })
      if (!parsed.success) return reply.code(400).send({ error: parsed.error.format() })

      let q = supabase
        .from('audit_log')
        .select('*, profiles(email, full_name, username)')
        .eq('org_id', req.params.id)
        .order('created_at', { ascending: false })
        .limit(parsed.data.limit)

      if (parsed.data.category) q = q.eq('event_category', parsed.data.category)
      if (parsed.data.eventType) q = q.eq('event_type', parsed.data.eventType)
      if (parsed.data.userId) q = q.eq('user_id', parsed.data.userId)
      if (parsed.data.startDate) q = q.gte('created_at', parsed.data.startDate)
      if (parsed.data.endDate) q = q.lte('created_at', parsed.data.endDate)

      const { data } = await q

      // Audit log'a erişimi de logla (compliance — kim ne zaman audit'e baktı)
      await audit({
        orgId: req.params.id,
        userId,
        eventType: AUDIT_EVENTS.AUDIT_LOG_EXPORTED,
        eventCategory: 'security',
        metadata: { filter: parsed.data, rowsReturned: data?.length ?? 0 },
      })

      return { logs: data ?? [] }
    },
  )

  /** POST /api/orgs/:id/audit/export — CSV indir */
  fastify.post<{ Params: { id: string }; Body: { startDate: string; endDate: string } }>(
    '/api/orgs/:id/audit/export',
    async (req, reply) => {
      const userId = await verifyUserToken(req.headers.authorization)
      if (!userId) return reply.code(401).send({ error: 'unauthorized' })

      const { data: member } = await supabase
        .from('organization_members')
        .select('role')
        .eq('org_id', req.params.id)
        .eq('user_id', userId)
        .single()

      if (!member || !['owner', 'admin'].includes(member.role)) {
        return reply.code(403).send({ error: 'forbidden' })
      }

      const { data } = await supabase
        .from('audit_log')
        .select('*, profiles(email, full_name)')
        .eq('org_id', req.params.id)
        .gte('created_at', req.body.startDate)
        .lte('created_at', req.body.endDate)
        .order('created_at', { ascending: false })

      // CSV format
      const header = 'Timestamp,Event,Category,User,Email,Target,IP,Metadata\n'
      const rows = (data ?? []).map((l: any) =>
        [
          l.created_at,
          l.event_type,
          l.event_category,
          l.profiles?.full_name ?? '',
          l.profiles?.email ?? '',
          l.target_type ?? '',
          l.ip_address ?? '',
          JSON.stringify(l.metadata).replace(/"/g, '""'),
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(','),
      )

      const csv = header + rows.join('\n')

      reply.header('Content-Type', 'text/csv; charset=utf-8')
      reply.header('Content-Disposition', `attachment; filename="kavra-audit-${req.params.id}.csv"`)
      return reply.send(csv)
    },
  )
}
