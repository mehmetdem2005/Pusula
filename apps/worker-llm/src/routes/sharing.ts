import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { supabase, verifyUserToken } from '../supabase.js'

/**
 * Notebook Sharing — Public links, gallery, fork
 * ================================================
 *
 * Akış:
 *   1. Kullanıcı defterini "public" yapar → otomatik slug
 *   2. https://kavra.app/n/abc12345 linkten erişilir (login gerekmez)
 *   3. Görüntüleme/save sayısı sayılır
 *   4. Beğenen kullanıcı "Save" butonuyla ya kaydeder ya da clone'lar
 *
 * Privacy:
 *   - Public defter sadece source TITLES + notebook metadata gösterir
 *   - Source CONTENT (chunks, full text) GÖSTERİLMEZ — sadece sahibi görür
 *   - Studio outputs (özet, podcast) public erişilebilir (kullanıcı seçimi)
 *   - Chat history asla public
 */

const ShareSchema = z.object({
  notebookId: z.string().uuid(),
  isPublic: z.boolean(),
  category: z.string().max(40).optional(),
  allowClone: z.boolean().optional().default(true),
})

const GallerySchema = z.object({
  category: z.string().optional(),
  sort: z.enum(['recent', 'popular', 'most-saved']).default('popular'),
  limit: z.number().int().min(1).max(50).default(20),
  offset: z.number().int().min(0).default(0),
})

export async function sharingRoutes(fastify: FastifyInstance) {
  /** POST /api/notebooks/:id/share */
  fastify.post<{ Params: { id: string } }>('/api/notebooks/:id/share', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const parsed = ShareSchema.safeParse({ notebookId: req.params.id, ...(req.body as object) })
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.format() })

    // Sahiplik kontrol
    const { data: nb } = await supabase
      .from('notebooks')
      .select('id, user_id, public_slug, title')
      .eq('id', req.params.id)
      .eq('user_id', userId)
      .single()

    if (!nb) return reply.code(404).send({ error: 'not_found' })

    // Slug üret (yoksa)
    let slug = nb.public_slug
    if (!slug && parsed.data.isPublic) {
      // Generate unique slug
      for (let attempt = 0; attempt < 5; attempt++) {
        const { data: gen } = await supabase.rpc('generate_notebook_slug')
        const candidate = gen as unknown as string
        const { data: existing } = await supabase
          .from('notebooks')
          .select('id')
          .eq('public_slug', candidate)
          .maybeSingle()
        if (!existing) {
          slug = candidate
          break
        }
      }
    }

    const update: any = {
      is_public: parsed.data.isPublic,
      category: parsed.data.category,
      allow_clone: parsed.data.allowClone,
    }
    if (parsed.data.isPublic) {
      update.public_slug = slug
      update.shared_at = new Date().toISOString()
    }

    const { data: updated, error } = await supabase
      .from('notebooks')
      .update(update)
      .eq('id', req.params.id)
      .select()
      .single()

    if (error) return reply.code(500).send({ error: error.message })

    // Achievement: ilk paylaşım
    if (parsed.data.isPublic) {
      await supabase.from('user_achievements').upsert(
        {
          user_id: userId,
          achievement_id: 'first-share',
          is_unlocked: true,
          progress: 1,
        },
        { onConflict: 'user_id,achievement_id' },
      )
    }

    return {
      notebook: updated,
      shareUrl: slug ? `https://kavra.app/n/${slug}` : null,
    }
  })

  /** GET /api/n/:slug (anonim erişim — login gerekmez) */
  fastify.get<{ Params: { slug: string } }>('/api/n/:slug', async (req, reply) => {
    const { data: nb } = await supabase
      .from('notebooks')
      .select(`
          id, title, description, language, category,
          public_slug, view_count, save_count, shared_at, allow_clone,
          source_count, total_words,
          user_id,
          profiles!notebooks_user_id_fkey(id, username, full_name, avatar_url, is_public)
        `)
      .eq('public_slug', req.params.slug)
      .eq('is_public', true)
      .single()

    if (!nb) return reply.code(404).send({ error: 'not_found' })

    // Source titles only (içerik yok)
    const { data: sources } = await supabase
      .from('notebook_sources')
      .select(
        'id, title, source_type, status, char_count, youtube_duration_seconds, transcript_source',
      )
      .eq('notebook_id', nb.id)
      .order('created_at', { ascending: true })

    // Public studio outputs (sadece audio_overview ve summary)
    const { data: studio } = await supabase
      .from('generated_content')
      .select('id, title, content_type, status, created_at')
      .eq('notebook_id', nb.id)
      .in('content_type', ['audio_overview', 'summary'])
      .eq('status', 'ready')

    // View count++
    await supabase.rpc('increment_notebook_views', { p_notebook_id: nb.id })

    // Saved-by-current-user
    const userId = await verifyUserToken(req.headers.authorization).catch(() => null)
    let isSaved = false
    if (userId) {
      const { data: save } = await supabase
        .from('notebook_saves')
        .select('id')
        .eq('user_id', userId)
        .eq('notebook_id', nb.id)
        .maybeSingle()
      isSaved = !!save
    }

    return {
      notebook: nb,
      sources: sources ?? [],
      studio: studio ?? [],
      isSaved,
    }
  })

  /** POST /api/notebooks/:id/save (yıldızla / sakla) */
  fastify.post<{ Params: { id: string } }>('/api/notebooks/:id/save', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const { data: nb } = await supabase
      .from('notebooks')
      .select('id, is_public, save_count')
      .eq('id', req.params.id)
      .single()

    if (!nb || !nb.is_public) {
      return reply.code(404).send({ error: 'not_public' })
    }

    // Toggle save
    const { data: existing } = await supabase
      .from('notebook_saves')
      .select('id')
      .eq('user_id', userId)
      .eq('notebook_id', req.params.id)
      .maybeSingle()

    if (existing) {
      await supabase.from('notebook_saves').delete().eq('id', existing.id)
      await supabase
        .from('notebooks')
        .update({ save_count: Math.max(0, nb.save_count - 1) })
        .eq('id', nb.id)
      return { saved: false, saveCount: Math.max(0, nb.save_count - 1) }
    } else {
      await supabase.from('notebook_saves').insert({
        user_id: userId,
        notebook_id: req.params.id,
      })
      await supabase
        .from('notebooks')
        .update({ save_count: nb.save_count + 1 })
        .eq('id', nb.id)
      return { saved: true, saveCount: nb.save_count + 1 }
    }
  })

  /** POST /api/notebooks/:id/clone (defteri kopyala) */
  fastify.post<{ Params: { id: string } }>('/api/notebooks/:id/clone', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const { data: orig } = await supabase
      .from('notebooks')
      .select('*')
      .eq('id', req.params.id)
      .eq('is_public', true)
      .eq('allow_clone', true)
      .single()

    if (!orig) return reply.code(404).send({ error: 'not_cloneable' })

    // Pro check (clone Pro-only)
    const { data: ent } = await supabase
      .from('user_entitlements')
      .select('is_pro')
      .eq('user_id', userId)
      .single()
    if (!ent?.is_pro) {
      return reply
        .code(402)
        .send({ error: 'pro_required', message: 'Defter klonlama Pro özelliğidir.' })
    }

    // Yeni defter oluştur (sources DEEP COPY edilir)
    const { data: cloned } = await supabase
      .from('notebooks')
      .insert({
        user_id: userId,
        title: `${orig.title} (kopya)`,
        description: orig.description,
        language: orig.language,
        category: orig.category,
        icon: orig.icon,
        color: orig.color,
        is_public: false, // klon default private
      })
      .select()
      .single()

    // Sources clone
    const { data: origSources } = await supabase
      .from('notebook_sources')
      .select('*')
      .eq('notebook_id', orig.id)

    if (origSources && origSources.length > 0 && cloned) {
      const newSources = origSources.map((s) => ({
        ...s,
        id: undefined,
        notebook_id: cloned.id,
        user_id: userId,
        created_at: undefined,
        updated_at: undefined,
      }))
      await supabase.from('notebook_sources').insert(newSources)

      // NOT: chunks ve embeddings clone EDİLMEZ — kullanıcı kendi worker'ında işler
      // Bu maliyeti ve copyright sorunlarını çözer
    }

    // Save kaydı
    await supabase.from('notebook_saves').upsert(
      {
        user_id: userId,
        notebook_id: orig.id,
        cloned_notebook_id: cloned!.id,
      },
      { onConflict: 'user_id,notebook_id' },
    )

    return { cloned, originalId: orig.id }
  })

  /** GET /api/gallery (curated public defterler) */
  fastify.get<{ Querystring: any }>('/api/gallery', async (req, reply) => {
    const q = req.query as Record<string, string | undefined>
    const parsed = GallerySchema.safeParse({
      ...q,
      limit: q.limit ? Number.parseInt(q.limit) : undefined,
      offset: q.offset ? Number.parseInt(q.offset) : undefined,
    })
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.format() })

    let query = supabase
      .from('notebooks')
      .select(`
        id, title, description, language, category,
        public_slug, view_count, save_count, shared_at, source_count, total_words,
        profiles!notebooks_user_id_fkey(username, full_name, avatar_url)
      `)
      .eq('is_public', true)
      .range(parsed.data.offset, parsed.data.offset + parsed.data.limit - 1)

    if (parsed.data.category) query = query.eq('category', parsed.data.category)

    if (parsed.data.sort === 'recent') {
      query = query.order('shared_at', { ascending: false })
    } else if (parsed.data.sort === 'most-saved') {
      query = query.order('save_count', { ascending: false })
    } else {
      // popular: views * 0.3 + saves * 0.7 (saved daha güçlü sinyal)
      query = query
        .order('save_count', { ascending: false })
        .order('view_count', { ascending: false })
    }

    const { data, error } = await query
    if (error) return reply.code(500).send({ error: error.message })

    // Categories dağılımı (frontend filter için)
    const { data: cats } = await supabase
      .from('notebooks')
      .select('category')
      .eq('is_public', true)
      .not('category', 'is', null)

    const categoryCounts: Record<string, number> = {}
    for (const r of cats ?? []) {
      const c = (r as any).category as string
      categoryCounts[c] = (categoryCounts[c] ?? 0) + 1
    }

    return {
      notebooks: data ?? [],
      categories: categoryCounts,
    }
  })
}
