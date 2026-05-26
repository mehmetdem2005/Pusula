import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { supabase, verifyUserToken } from '../supabase.js'

/**
 * Profile, Follow, Leaderboard, Achievements
 */

const UpdateProfileSchema = z.object({
  username: z
    .string()
    .regex(/^[a-z0-9_]{3,20}$/)
    .optional(),
  bio: z.string().max(200).optional(),
  pronouns: z.string().max(20).optional(),
  isPublic: z.boolean().optional(),
  bannerColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
})

export async function socialRoutes(fastify: FastifyInstance) {
  // ============== PROFILE ===============

  /** PATCH /api/me/profile */
  fastify.patch('/api/me/profile', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const parsed = UpdateProfileSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.format() })

    // Username unique check
    if (parsed.data.username) {
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', parsed.data.username)
        .neq('id', userId)
        .maybeSingle()
      if (existing) {
        return reply.code(400).send({ error: 'username_taken' })
      }
    }

    const { data, error } = await supabase
      .from('profiles')
      .update({
        username: parsed.data.username,
        bio: parsed.data.bio,
        pronouns: parsed.data.pronouns,
        is_public: parsed.data.isPublic,
        banner_color: parsed.data.bannerColor,
      })
      .eq('id', userId)
      .select()
      .single()

    if (error) return reply.code(500).send({ error: error.message })
    return { profile: data }
  })

  /** GET /api/profiles/:username (public profil) */
  fastify.get<{ Params: { username: string } }>('/api/profiles/:username', async (req, reply) => {
    const { data: profile } = await supabase
      .from('profiles')
      .select(
        'id, username, full_name, bio, pronouns, avatar_url, banner_color, is_public, created_at',
      )
      .eq('username', req.params.username)
      .single()

    if (!profile || !profile.is_public) {
      return reply.code(404).send({ error: 'not_found' })
    }

    // Stats
    const { data: stats } = await supabase.rpc('user_public_stats', { p_user_id: profile.id })

    // Public defterleri
    const { data: notebooks } = await supabase
      .from('notebooks')
      .select(
        'id, title, description, public_slug, view_count, save_count, shared_at, source_count, category',
      )
      .eq('user_id', profile.id)
      .eq('is_public', true)
      .order('shared_at', { ascending: false })
      .limit(20)

    // Achievements (rarity'ye göre)
    const { data: achievements } = await supabase
      .from('user_achievements')
      .select(
        'achievement_id, unlocked_at, achievements(name, emoji, description, rarity, category)',
      )
      .eq('user_id', profile.id)
      .eq('is_unlocked', true)
      .order('unlocked_at', { ascending: false })

    // Follow status (current user)
    const currentUserId = await verifyUserToken(req.headers.authorization).catch(() => null)
    let isFollowing = false
    if (currentUserId && currentUserId !== profile.id) {
      const { data: f } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('follower_id', currentUserId)
        .eq('following_id', profile.id)
        .maybeSingle()
      isFollowing = !!f
    }

    return {
      profile,
      stats: (stats as any)?.[0] ?? {},
      notebooks: notebooks ?? [],
      achievements: achievements ?? [],
      isFollowing,
      isSelf: currentUserId === profile.id,
    }
  })

  // ============== FOLLOW ===============

  /** POST /api/profiles/:userId/follow */
  fastify.post<{ Params: { userId: string } }>(
    '/api/profiles/:userId/follow',
    async (req, reply) => {
      const followerId = await verifyUserToken(req.headers.authorization)
      if (!followerId) return reply.code(401).send({ error: 'unauthorized' })

      if (followerId === req.params.userId) {
        return reply.code(400).send({ error: 'cannot_follow_self' })
      }

      // Toggle
      const { data: existing } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('follower_id', followerId)
        .eq('following_id', req.params.userId)
        .maybeSingle()

      if (existing) {
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', followerId)
          .eq('following_id', req.params.userId)
        return { following: false }
      } else {
        await supabase.from('follows').insert({
          follower_id: followerId,
          following_id: req.params.userId,
        })
        return { following: true }
      }
    },
  )

  /** GET /api/profiles/:userId/followers */
  fastify.get<{ Params: { userId: string }; Querystring: { type?: string; limit?: string } }>(
    '/api/profiles/:userId/connections',
    async (req, reply) => {
      const type = req.query.type ?? 'followers'
      const limit = Math.min(Number.parseInt(req.query.limit ?? '50'), 200)

      let query
      if (type === 'followers') {
        query = supabase
          .from('follows')
          .select(
            'created_at, profiles!follows_follower_id_fkey(id, username, full_name, avatar_url)',
          )
          .eq('following_id', req.params.userId)
      } else {
        query = supabase
          .from('follows')
          .select(
            'created_at, profiles!follows_following_id_fkey(id, username, full_name, avatar_url)',
          )
          .eq('follower_id', req.params.userId)
      }

      const { data } = await query.limit(limit)
      return { connections: data ?? [] }
    },
  )

  // ============== LEADERBOARD ===============

  /** GET /api/leaderboard */
  fastify.get<{ Querystring: { period?: string; clanId?: string; limit?: string } }>(
    '/api/leaderboard',
    async (req, reply) => {
      const userId = await verifyUserToken(req.headers.authorization).catch(() => null)
      const period = req.query.period ?? 'weekly'
      const limit = Math.min(Number.parseInt(req.query.limit ?? '50'), 100)

      // Klan içi liderlik
      if (req.query.clanId) {
        // Üye kontrol
        if (userId) {
          const { data: member } = await supabase
            .from('clan_members')
            .select('clan_id')
            .eq('clan_id', req.query.clanId)
            .eq('user_id', userId)
            .single()
          if (!member) return reply.code(403).send({ error: 'not_member' })
        }

        const { data: members } = await supabase
          .from('clan_members')
          .select(`
            weekly_reviews, weekly_minutes, current_streak,
            profiles(id, username, full_name, avatar_url)
          `)
          .eq('clan_id', req.query.clanId)
          .order('weekly_reviews', { ascending: false })
          .limit(limit)

        const ranked = (members ?? []).map((m: any, i: number) => ({
          rank: i + 1,
          user: m.profiles,
          weeklyReviews: m.weekly_reviews,
          weeklyMinutes: m.weekly_minutes,
          currentStreak: m.current_streak,
        }))

        return { entries: ranked, period: 'weekly', scope: 'clan' }
      }

      // Global leaderboard (materialized view'dan)
      const { data } = await supabase
        .from('weekly_leaderboard')
        .select('*')
        .order('rank', { ascending: true })
        .limit(limit)

      // Current user'ın yeri
      let myRank = null
      if (userId) {
        const { data: me } = await supabase
          .from('weekly_leaderboard')
          .select('*')
          .eq('user_id', userId)
          .single()
        myRank = me
      }

      return { entries: data ?? [], myRank, period, scope: 'global' }
    },
  )

  // ============== ACHIEVEMENTS ===============

  /** GET /api/achievements (tüm rozetler + kullanıcının kazandıkları) */
  fastify.get('/api/achievements', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization).catch(() => null)

    const { data: all } = await supabase
      .from('achievements')
      .select('*')
      .eq('is_active', true)
      .order('display_order')

    let unlocked = new Set<string>()
    if (userId) {
      const { data } = await supabase
        .from('user_achievements')
        .select('achievement_id')
        .eq('user_id', userId)
        .eq('is_unlocked', true)
      unlocked = new Set((data ?? []).map((d) => d.achievement_id))
    }

    const enriched = (all ?? []).map((a) => ({
      ...a,
      isUnlocked: unlocked.has(a.id),
    }))

    return {
      achievements: enriched,
      unlockedCount: unlocked.size,
      totalCount: enriched.length,
    }
  })

  /** GET /api/achievements/check (sıkça çağrılır — yeni kazanılan kontrolü) */
  fastify.get('/api/achievements/check', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    // Stats çek
    const { data: stats } = await supabase.rpc('user_public_stats', { p_user_id: userId })
    const s = (stats as any)?.[0] ?? {}

    const newlyUnlocked: any[] = []

    // Reviews threshold check
    const reviewMilestones = [
      { id: 'reviews-100', threshold: 100 },
      { id: 'reviews-1000', threshold: 1000 },
      { id: 'reviews-10000', threshold: 10000 },
    ]

    for (const m of reviewMilestones) {
      if ((s.reviews_total ?? 0) >= m.threshold) {
        const { data: ach } = await supabase
          .from('user_achievements')
          .upsert(
            {
              user_id: userId,
              achievement_id: m.id,
              is_unlocked: true,
              progress: m.threshold,
            },
            { onConflict: 'user_id,achievement_id', ignoreDuplicates: false },
          )
          .select()
        if (ach && ach.length > 0) newlyUnlocked.push(m.id)
      }
    }

    // Streak achievements
    const streakMilestones = [
      { id: 'streak-7', threshold: 7 },
      { id: 'streak-30', threshold: 30 },
      { id: 'streak-100', threshold: 100 },
      { id: 'streak-365', threshold: 365 },
    ]
    for (const m of streakMilestones) {
      if ((s.current_streak ?? 0) >= m.threshold) {
        await supabase.from('user_achievements').upsert(
          {
            user_id: userId,
            achievement_id: m.id,
            is_unlocked: true,
            progress: m.threshold,
          },
          { onConflict: 'user_id,achievement_id' },
        )
      }
    }

    // View milestones
    if ((s.total_views ?? 0) >= 100) {
      await supabase.from('user_achievements').upsert(
        {
          user_id: userId,
          achievement_id: 'viral-share',
          is_unlocked: true,
          progress: s.total_views,
        },
        { onConflict: 'user_id,achievement_id' },
      )
    }

    if ((s.total_saves ?? 0) >= 100) {
      await supabase.from('user_achievements').upsert(
        {
          user_id: userId,
          achievement_id: 'saved-by-100',
          is_unlocked: true,
          progress: s.total_saves,
        },
        { onConflict: 'user_id,achievement_id' },
      )
    }

    return { newlyUnlocked, stats: s }
  })

  /** POST /api/achievements/event — manuel event (gece kuşu, ilk podcast, vb.) */
  fastify.post<{ Body: { event: string } }>('/api/achievements/event', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const eventToAch: Record<string, string> = {
      'first-notebook': 'first-notebook',
      'first-podcast': 'first-podcast',
      'late-night-review': 'night-owl',
      'early-morning-review': 'early-bird',
      'pro-upgrade': 'first-pro',
      'lifetime-purchase': 'lifetime-club',
    }

    const achId = eventToAch[req.body.event]
    if (!achId) return reply.code(400).send({ error: 'unknown_event' })

    await supabase.from('user_achievements').upsert(
      {
        user_id: userId,
        achievement_id: achId,
        is_unlocked: true,
        progress: 1,
      },
      { onConflict: 'user_id,achievement_id' },
    )

    return { unlocked: achId }
  })
}
