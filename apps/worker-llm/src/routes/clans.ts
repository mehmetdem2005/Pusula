import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { supabase, verifyUserToken } from '../supabase.js'

/**
 * Clans — 10 kişilik study group
 * ================================
 *
 * Sosyal mekanik:
 *   - Bir kullanıcı 1 klan kurar (founder), sonsuz katılır
 *   - Davet kodu ile katılım veya public klan listesi
 *   - Klan içi basit chat (system + text + achievement messages)
 *   - Haftalık liderlik tablosu klan içinde
 *   - Free: 10 üye max, Pro klan: 25 üye max
 *
 * Anti-abuse:
 *   - 1 user 1 klan kurabilir (founder olarak)
 *   - Free üyeler 3 klana katılabilir, Pro 10
 *   - Mesajlar moderation'dan geçer (Sprint 5'teki moderation route)
 */

const CreateClanSchema = z.object({
  name: z.string().min(3).max(40),
  slug: z.string().regex(/^[a-z0-9-]{3,30}$/),
  description: z.string().max(500).optional(),
  emoji: z.string().max(10).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  isPublic: z.boolean().optional().default(true),
})

const UpdateClanSchema = z.object({
  name: z.string().min(3).max(40).optional(),
  description: z.string().max(500).optional(),
  emoji: z.string().max(10).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  isPublic: z.boolean().optional(),
})

const PostMessageSchema = z.object({
  content: z.string().min(1).max(1000),
  replyTo: z.string().uuid().optional(),
})

export async function clansRoutes(fastify: FastifyInstance) {
  /** POST /api/clans (klan kur) */
  fastify.post('/api/clans', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const parsed = CreateClanSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.format() })

    // Tek klan kuralı (founder kontrol)
    const { count: foundedCount } = await supabase
      .from('clans')
      .select('*', { count: 'exact', head: true })
      .eq('founder_id', userId)

    const { data: ent } = await supabase
      .from('user_entitlements')
      .select('is_pro')
      .eq('user_id', userId)
      .single()
    const maxFounded = ent?.is_pro ? 5 : 1

    if ((foundedCount ?? 0) >= maxFounded) {
      return reply.code(400).send({
        error: 'max_founded',
        message: `${maxFounded} klan kurabilirsin. ${ent?.is_pro ? '' : 'Pro üyeler 5 klan kurabilir.'}`,
      })
    }

    // Slug unique check
    const { data: existing } = await supabase
      .from('clans')
      .select('id')
      .eq('slug', parsed.data.slug)
      .maybeSingle()

    if (existing) {
      return reply.code(400).send({ error: 'slug_taken', message: 'Bu URL zaten kullanılıyor.' })
    }

    // Klan oluştur
    const { data: clan, error } = await supabase
      .from('clans')
      .insert({
        name: parsed.data.name,
        slug: parsed.data.slug,
        description: parsed.data.description,
        emoji: parsed.data.emoji ?? '🦁',
        color: parsed.data.color ?? '#1E1B4B',
        founder_id: userId,
        is_public: parsed.data.isPublic,
        max_members: ent?.is_pro ? 25 : 10,
      })
      .select()
      .single()

    if (error) return reply.code(500).send({ error: error.message })

    // Founder'ı member olarak ekle
    await supabase.from('clan_members').insert({
      clan_id: clan.id,
      user_id: userId,
      role: 'founder',
    })

    // System message (klan kuruldu)
    await supabase.from('clan_messages').insert({
      clan_id: clan.id,
      user_id: userId,
      content: `${parsed.data.emoji ?? '🦁'} ${parsed.data.name} klanı kuruldu!`,
      message_type: 'system',
    })

    // Achievement
    await supabase.from('user_achievements').upsert(
      {
        user_id: userId,
        achievement_id: 'clan-founder',
        is_unlocked: true,
        progress: 1,
      },
      { onConflict: 'user_id,achievement_id' },
    )

    return { clan }
  })

  /** GET /api/clans (kullanıcının klanları) */
  fastify.get('/api/clans', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const { data: memberships } = await supabase
      .from('clan_members')
      .select('clan_id, role, joined_at, weekly_reviews, current_streak, clans(*)')
      .eq('user_id', userId)
      .order('joined_at', { ascending: false })

    return { memberships: memberships ?? [] }
  })

  /** GET /api/clans/discover (public klanları keşfet) */
  fastify.get<{ Querystring: { search?: string; limit?: string } }>(
    '/api/clans/discover',
    async (req, reply) => {
      const limit = Math.min(Number.parseInt(req.query.limit ?? '20'), 50)

      let q = supabase
        .from('clans')
        .select(
          'id, name, slug, description, emoji, color, member_count, max_members, total_streak_days',
        )
        .eq('is_public', true)
        .order('member_count', { ascending: false })
        .limit(limit)

      if (req.query.search) {
        q = q.or(`name.ilike.%${req.query.search}%,description.ilike.%${req.query.search}%`)
      }

      const { data } = await q
      return { clans: data ?? [] }
    },
  )

  /** GET /api/clans/:slug */
  fastify.get<{ Params: { slug: string } }>('/api/clans/:slug', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization).catch(() => null)

    const { data: clan } = await supabase
      .from('clans')
      .select(`*, profiles!clans_founder_id_fkey(username, full_name, avatar_url)`)
      .eq('slug', req.params.slug)
      .single()

    if (!clan) return reply.code(404).send({ error: 'not_found' })

    // Üye listesi (haftalık skorlarla)
    const { data: members } = await supabase
      .from('clan_members')
      .select(`
        role, joined_at, weekly_reviews, weekly_minutes, current_streak,
        profiles(id, username, full_name, avatar_url)
      `)
      .eq('clan_id', clan.id)
      .order('weekly_reviews', { ascending: false })

    // Kullanıcı üye mi?
    const isMember = userId ? !!(members ?? []).find((m: any) => m.profiles?.id === userId) : false

    return { clan, members: members ?? [], isMember }
  })

  /** POST /api/clans/:id/join (davet kodu veya direkt) */
  fastify.post<{ Params: { id: string }; Body: { inviteCode?: string } }>(
    '/api/clans/:id/join',
    async (req, reply) => {
      const userId = await verifyUserToken(req.headers.authorization)
      if (!userId) return reply.code(401).send({ error: 'unauthorized' })

      const { data: clan } = await supabase
        .from('clans')
        .select('id, member_count, max_members, is_public, invite_code')
        .eq('id', req.params.id)
        .single()

      if (!clan) return reply.code(404).send({ error: 'not_found' })

      // Public değilse davet kodu lazım
      if (!clan.is_public && req.body.inviteCode !== clan.invite_code) {
        return reply.code(403).send({ error: 'invite_required' })
      }

      // Doluysa
      if (clan.member_count >= clan.max_members) {
        return reply.code(400).send({ error: 'clan_full' })
      }

      // Free üye 3, Pro 10 klan limiti
      const { count: joinedCount } = await supabase
        .from('clan_members')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)

      const { data: ent } = await supabase
        .from('user_entitlements')
        .select('is_pro')
        .eq('user_id', userId)
        .single()
      const maxJoinable = ent?.is_pro ? 10 : 3

      if ((joinedCount ?? 0) >= maxJoinable) {
        return reply.code(400).send({
          error: 'max_clans',
          message: `Maksimum ${maxJoinable} klana katılabilirsin.`,
        })
      }

      // Insert
      const { error } = await supabase.from('clan_members').insert({
        clan_id: clan.id,
        user_id: userId,
      })

      if (error) {
        if (error.code === '23505') return reply.code(400).send({ error: 'already_member' })
        return reply.code(500).send({ error: error.message })
      }

      // System message
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, full_name')
        .eq('id', userId)
        .single()

      await supabase.from('clan_messages').insert({
        clan_id: clan.id,
        user_id: userId,
        content: `${profile?.username ?? profile?.full_name ?? 'Yeni üye'} klana katıldı 👋`,
        message_type: 'system',
      })

      // Achievement
      await supabase.from('user_achievements').upsert(
        {
          user_id: userId,
          achievement_id: 'first-clan',
          is_unlocked: true,
          progress: 1,
        },
        { onConflict: 'user_id,achievement_id' },
      )

      return { ok: true }
    },
  )

  /** DELETE /api/clans/:id/leave */
  fastify.delete<{ Params: { id: string } }>('/api/clans/:id/leave', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    // Founder ayrılırsa klan dağılır mı? Hayır — başkasına devret veya silinir
    const { data: member } = await supabase
      .from('clan_members')
      .select('role')
      .eq('clan_id', req.params.id)
      .eq('user_id', userId)
      .single()

    if (!member) return reply.code(404).send({ error: 'not_member' })

    if (member.role === 'founder') {
      return reply.code(400).send({
        error: 'founder_cannot_leave',
        message: 'Önce başka birine kurucu rolünü ver veya klanı sil.',
      })
    }

    await supabase.from('clan_members').delete().eq('clan_id', req.params.id).eq('user_id', userId)

    return { ok: true }
  })

  /** GET /api/clans/:id/messages */
  fastify.get<{ Params: { id: string }; Querystring: { before?: string; limit?: string } }>(
    '/api/clans/:id/messages',
    async (req, reply) => {
      const userId = await verifyUserToken(req.headers.authorization)
      if (!userId) return reply.code(401).send({ error: 'unauthorized' })

      // Üye kontrol
      const { data: member } = await supabase
        .from('clan_members')
        .select('clan_id')
        .eq('clan_id', req.params.id)
        .eq('user_id', userId)
        .single()

      if (!member) return reply.code(403).send({ error: 'not_member' })

      const limit = Math.min(Number.parseInt(req.query.limit ?? '50'), 100)
      let q = supabase
        .from('clan_messages')
        .select(`
          id, content, message_type, reply_to, created_at, edited_at,
          profiles(id, username, full_name, avatar_url)
        `)
        .eq('clan_id', req.params.id)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (req.query.before) q = q.lt('created_at', req.query.before)

      const { data } = await q
      return { messages: (data ?? []).reverse() }
    },
  )

  /** POST /api/clans/:id/messages */
  fastify.post<{ Params: { id: string } }>('/api/clans/:id/messages', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const parsed = PostMessageSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.format() })

    const { data: member } = await supabase
      .from('clan_members')
      .select('clan_id')
      .eq('clan_id', req.params.id)
      .eq('user_id', userId)
      .single()

    if (!member) return reply.code(403).send({ error: 'not_member' })

    const { data: msg, error } = await supabase
      .from('clan_messages')
      .insert({
        clan_id: req.params.id,
        user_id: userId,
        content: parsed.data.content,
        reply_to: parsed.data.replyTo,
      })
      .select(`
          id, content, message_type, reply_to, created_at,
          profiles(id, username, full_name, avatar_url)
        `)
      .single()

    if (error) return reply.code(500).send({ error: error.message })
    return { message: msg }
  })
}
