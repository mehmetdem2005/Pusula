import crypto from 'crypto'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { AUDIT_EVENTS, audit } from '../lib/audit.js'
import { supabase, verifyUserToken } from '../supabase.js'

/**
 * Bulk Import + SCIM 2.0
 * =======================
 *
 * 1. Bulk CSV Import — Admin elle .csv yükler, batch user invitation
 * 2. SCIM 2.0 Provisioning — Google Workspace / Microsoft Entra otomatik sync
 *    - Kullanıcı IdP'de oluşturulduğunda → Kavra'ya provisioning
 *    - Kullanıcı IdP'de silindiğinde → Kavra'da deactive
 *    - Group membership → role assignment
 *
 * SCIM endpoint'leri RFC 7644 uyumlu — IdP'lerin "out of the box" çalışması için.
 */

const BulkImportSchema = z.object({
  orgId: z.string().uuid(),
  rows: z
    .array(
      z.object({
        email: z.string().email(),
        fullName: z.string().min(1).max(100).optional(),
        role: z.enum(['admin', 'teacher', 'member', 'student']).default('student'),
        classSlug: z.string().optional(), // varsa otomatik atama
      }),
    )
    .min(1)
    .max(500),
})

async function checkOrgAdmin(userId: string, orgId: string): Promise<boolean> {
  const { data } = await supabase
    .from('organization_members')
    .select('role')
    .eq('org_id', orgId)
    .eq('user_id', userId)
    .single()
  return !!data && ['owner', 'admin'].includes(data.role)
}

async function verifyScimToken(token: string, orgId: string): Promise<boolean> {
  const { data: org } = await supabase
    .from('organizations')
    .select('scim_token_hash, scim_enabled')
    .eq('id', orgId)
    .single()

  if (!org?.scim_enabled || !org?.scim_token_hash) return false

  // Bcrypt yerine basit hash karşılaştırma (production'da bcrypt.compare kullan)
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
  return tokenHash === org.scim_token_hash
}

export async function provisioningRoutes(fastify: FastifyInstance) {
  // ============== BULK CSV IMPORT ==============

  /** POST /api/orgs/:id/bulk-import */
  fastify.post<{ Params: { id: string } }>('/api/orgs/:id/bulk-import', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    if (!(await checkOrgAdmin(userId, req.params.id))) {
      return reply.code(403).send({ error: 'forbidden' })
    }

    const parsed = BulkImportSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.format() })

    // Seat check
    const { data: org } = await supabase
      .from('organizations')
      .select('seats_used, max_seats')
      .eq('id', req.params.id)
      .single()

    if (!org) return reply.code(404).send({ error: 'org_not_found' })
    const requiredSeats = parsed.data.rows.length
    if (org.seats_used + requiredSeats > org.max_seats) {
      return reply.code(400).send({
        error: 'insufficient_seats',
        message: `${requiredSeats} import için yer yok. Şu an ${org.max_seats - org.seats_used} boş.`,
      })
    }

    // Class slug → id map
    const classSlugs = [
      ...new Set(parsed.data.rows.map((r) => r.classSlug).filter(Boolean) as string[]),
    ]
    const { data: classes } = await supabase
      .from('classes')
      .select('id, slug')
      .eq('org_id', req.params.id)
      .in('slug', classSlugs)
    const slugToId: Record<string, string> = {}
    ;(classes ?? []).forEach((c: any) => {
      slugToId[c.slug] = c.id
    })

    // Import işle
    const results = {
      added: 0,
      invited: 0,
      skipped: 0,
      errors: [] as Array<{ email: string; reason: string }>,
    }

    for (const row of parsed.data.rows) {
      try {
        // Profile var mı?
        const { data: existing } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', row.email)
          .maybeSingle()

        if (existing) {
          await supabase.from('organization_members').upsert(
            {
              org_id: req.params.id,
              user_id: existing.id,
              role: row.role,
              invited_by: userId,
              invitation_email: row.email,
              invitation_status: 'accepted',
            },
            { onConflict: 'org_id,user_id' },
          )

          // Class atama
          if (row.classSlug && slugToId[row.classSlug]) {
            await supabase.from('class_members').upsert(
              {
                class_id: slugToId[row.classSlug],
                user_id: existing.id,
                role: row.role === 'teacher' ? 'co_teacher' : 'student',
              },
              { onConflict: 'class_id,user_id' },
            )
          }

          results.added++
        } else {
          const token = crypto.randomBytes(24).toString('hex')
          await supabase.from('organization_members').insert({
            org_id: req.params.id,
            user_id: null as any,
            role: row.role,
            invitation_token: token,
            invitation_email: row.email,
            invitation_status: 'pending',
            invited_by: userId,
          } as any)

          results.invited++
        }
      } catch (e: any) {
        results.errors.push({ email: row.email, reason: e.message })
        results.skipped++
      }
    }

    await supabase.rpc('recompute_org_seats', { p_org_id: req.params.id })

    await audit({
      orgId: req.params.id,
      userId,
      eventType: 'org.bulk_import',
      eventCategory: 'org',
      metadata: {
        totalRows: parsed.data.rows.length,
        added: results.added,
        invited: results.invited,
        skipped: results.skipped,
      },
    })

    return results
  })

  // ============== SCIM 2.0 ==============
  // Endpoint: /api/scim/v2/orgs/:orgId/Users
  // Auth: Bearer SCIM token (org.scim_token_hash karşılaştırma)

  /** POST /api/orgs/:id/scim/generate-token */
  fastify.post<{ Params: { id: string } }>(
    '/api/orgs/:id/scim/generate-token',
    async (req, reply) => {
      const userId = await verifyUserToken(req.headers.authorization)
      if (!userId) return reply.code(401).send({ error: 'unauthorized' })

      if (!(await checkOrgAdmin(userId, req.params.id))) {
        return reply.code(403).send({ error: 'forbidden' })
      }

      // Yeni token üret
      const token = `scim_${crypto.randomBytes(32).toString('base64url')}`
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex')

      await supabase
        .from('organizations')
        .update({
          scim_enabled: true,
          scim_token_hash: tokenHash,
        })
        .eq('id', req.params.id)

      await audit({
        orgId: req.params.id,
        userId,
        eventType: AUDIT_EVENTS.SCIM_TOKEN_GENERATED,
        eventCategory: 'security',
      })

      return {
        token,
        message: "Bu token sadece bir kez gösterilir. IdP'ye kaydet.",
        endpoint: `https://api.kavra.app/api/scim/v2/orgs/${req.params.id}/Users`,
      }
    },
  )

  /** SCIM 2.0 — POST /api/scim/v2/orgs/:orgId/Users (User provision) */
  fastify.post<{ Params: { orgId: string }; Body: any }>(
    '/api/scim/v2/orgs/:orgId/Users',
    async (req, reply) => {
      const auth = req.headers.authorization?.replace('Bearer ', '')
      if (!auth || !(await verifyScimToken(auth, req.params.orgId))) {
        return reply
          .code(401)
          .send({
            schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
            detail: 'unauthorized',
            status: '401',
          })
      }

      const { userName, externalId, name, emails, active } = req.body as {
        userName?: string
        externalId?: string
        name?: { givenName?: string; familyName?: string; formatted?: string }
        emails?: Array<{ value: string; primary?: boolean }>
        active?: boolean
      }

      // Email primary
      const email = emails?.find((e: any) => e.primary)?.value ?? userName

      // Profile create veya match
      let { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle()

      if (!profile) {
        // Auth user yarat (Supabase admin API)
        const { data: authUser } = await supabase.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: {
            full_name:
              name?.formatted ?? `${name?.givenName ?? ''} ${name?.familyName ?? ''}`.trim(),
            scim_provisioned: true,
          },
        })
        if (authUser?.user) {
          profile = { id: authUser.user.id }
        }
      }

      if (!profile) {
        return reply
          .code(500)
          .send({
            schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
            detail: 'profile_create_failed',
            status: '500',
          })
      }

      // Org member upsert
      await supabase.from('organization_members').upsert(
        {
          org_id: req.params.orgId,
          user_id: profile.id,
          role: 'member',
          scim_external_id: externalId,
          scim_active: active ?? true,
          invitation_status: 'accepted',
        },
        { onConflict: 'org_id,user_id' },
      )

      await supabase.rpc('recompute_org_seats', { p_org_id: req.params.orgId })

      await audit({
        orgId: req.params.orgId,
        userId: profile.id,
        eventType: AUDIT_EVENTS.USER_PROVISIONED,
        eventCategory: 'user',
        metadata: { externalId, email },
      })

      // SCIM response format
      return reply.code(201).send({
        schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
        id: profile.id,
        externalId,
        userName: email,
        name: name ?? {},
        emails: [{ value: email, primary: true }],
        active: true,
        meta: {
          resourceType: 'User',
          created: new Date().toISOString(),
          location: `/api/scim/v2/orgs/${req.params.orgId}/Users/${profile.id}`,
        },
      })
    },
  )

  /** SCIM 2.0 — DELETE /api/scim/v2/orgs/:orgId/Users/:userId (deprovisioning) */
  fastify.delete<{ Params: { orgId: string; userId: string } }>(
    '/api/scim/v2/orgs/:orgId/Users/:userId',
    async (req, reply) => {
      const auth = req.headers.authorization?.replace('Bearer ', '')
      if (!auth || !(await verifyScimToken(auth, req.params.orgId))) {
        return reply
          .code(401)
          .send({
            schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
            detail: 'unauthorized',
            status: '401',
          })
      }

      // Soft deactivate (data corruption riskli — silmek yerine deactive)
      await supabase
        .from('organization_members')
        .update({ scim_active: false })
        .eq('org_id', req.params.orgId)
        .eq('user_id', req.params.userId)

      await supabase
        .from('user_entitlements')
        .update({ is_pro: false, tier: 'free' })
        .eq('user_id', req.params.userId)
        .eq('org_id', req.params.orgId)

      await supabase.rpc('recompute_org_seats', { p_org_id: req.params.orgId })

      await audit({
        orgId: req.params.orgId,
        userId: req.params.userId,
        eventType: AUDIT_EVENTS.USER_DEPROVISIONED,
        eventCategory: 'user',
      })

      return reply.code(204).send()
    },
  )

  /** SCIM 2.0 — GET /api/scim/v2/orgs/:orgId/Users (list) */
  fastify.get<{ Params: { orgId: string } }>(
    '/api/scim/v2/orgs/:orgId/Users',
    async (req, reply) => {
      const auth = req.headers.authorization?.replace('Bearer ', '')
      if (!auth || !(await verifyScimToken(auth, req.params.orgId))) {
        return reply
          .code(401)
          .send({
            schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
            detail: 'unauthorized',
            status: '401',
          })
      }

      const { data: members } = await supabase
        .from('organization_members')
        .select('user_id, scim_external_id, scim_active, profiles(email, full_name)')
        .eq('org_id', req.params.orgId)

      return {
        schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
        totalResults: members?.length ?? 0,
        Resources: (members ?? []).map((m: any) => ({
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
          id: m.user_id,
          externalId: m.scim_external_id,
          userName: m.profiles?.email,
          emails: [{ value: m.profiles?.email, primary: true }],
          active: m.scim_active,
        })),
      }
    },
  )
}
