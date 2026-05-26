import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { supabase, verifyUserToken } from '../supabase.js'

/**
 * Notebooks Routes — NotebookLM klonu için defter yönetimi
 * =========================================================
 *
 * Bir "defter" (notebook): birden fazla kaynak + chat geçmişi + üretilen içerikler
 */

const CreateNotebookSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  emoji: z.string().max(8).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  language: z.string().length(2).default('tr'),
})

const UpdateNotebookSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  emoji: z.string().max(8).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  is_archived: z.boolean().optional(),
  is_pinned: z.boolean().optional(),
})

export async function notebooksRoutes(fastify: FastifyInstance) {
  /** GET /api/notebooks */
  fastify.get<{ Querystring: { archived?: string } }>('/api/notebooks', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const archived = req.query.archived === 'true'

    const { data } = await supabase
      .from('notebooks')
      .select('*')
      .eq('user_id', userId)
      .eq('is_archived', archived)
      .order('is_pinned', { ascending: false })
      .order('last_accessed_at', { ascending: false })
      .limit(100)

    return { notebooks: data ?? [] }
  })

  /** GET /api/notebooks/:id (with sources count) */
  fastify.get<{ Params: { id: string } }>('/api/notebooks/:id', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const { data: notebook } = await supabase
      .from('notebooks')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', userId)
      .single()

    if (!notebook) return reply.code(404).send({ error: 'not_found' })

    // Update last_accessed
    await supabase
      .from('notebooks')
      .update({ last_accessed_at: new Date().toISOString() })
      .eq('id', req.params.id)

    const { data: sources } = await supabase
      .from('notebook_sources')
      .select(
        'id, source_type, title, status, chunk_count, language, word_count, created_at, metadata, external_url',
      )
      .eq('notebook_id', req.params.id)
      .order('created_at', { ascending: false })

    const { data: generated } = await supabase
      .from('generated_content')
      .select('id, content_type, title, status, duration_seconds, created_at, ready_at')
      .eq('notebook_id', req.params.id)
      .order('created_at', { ascending: false })
      .limit(50)

    return {
      notebook,
      sources: sources ?? [],
      generatedContent: generated ?? [],
    }
  })

  /** POST /api/notebooks */
  fastify.post('/api/notebooks', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const parsed = CreateNotebookSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.format() })

    // Free tier limit: 3 notebook
    const { data: ent } = await supabase
      .from('user_entitlements')
      .select('is_pro')
      .eq('user_id', userId)
      .single()

    if (!ent?.is_pro) {
      const { count } = await supabase
        .from('notebooks')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_archived', false)

      if ((count ?? 0) >= 3) {
        return reply.code(403).send({
          error: 'free_limit',
          message: "Free üyeler 3 aktif defter tutabilir. Pro'ya geç sınırsız aç.",
        })
      }
    }

    const { data, error } = await supabase
      .from('notebooks')
      .insert({
        user_id: userId,
        title: parsed.data.title,
        description: parsed.data.description,
        emoji: parsed.data.emoji ?? '📓',
        color: parsed.data.color ?? '#1E1B4B',
        language: parsed.data.language,
      })
      .select()
      .single()

    if (error) return reply.code(500).send({ error: error.message })
    return { notebook: data }
  })

  /** PATCH /api/notebooks/:id */
  fastify.patch<{ Params: { id: string } }>('/api/notebooks/:id', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const parsed = UpdateNotebookSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.format() })

    const { error } = await supabase
      .from('notebooks')
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('user_id', userId)

    if (error) return reply.code(500).send({ error: error.message })
    return { ok: true }
  })

  /** DELETE /api/notebooks/:id */
  fastify.delete<{ Params: { id: string } }>('/api/notebooks/:id', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    // Get sources to clean up storage
    const { data: sources } = await supabase
      .from('notebook_sources')
      .select('storage_path')
      .eq('notebook_id', req.params.id)

    const paths = (sources ?? []).map((s) => s.storage_path).filter(Boolean) as string[]
    if (paths.length > 0) {
      await supabase.storage.from('notebook-sources').remove(paths)
    }

    // Get generated content to clean
    const { data: generated } = await supabase
      .from('generated_content')
      .select('storage_path')
      .eq('notebook_id', req.params.id)

    const outPaths = (generated ?? []).map((g) => g.storage_path).filter(Boolean) as string[]
    if (outPaths.length > 0) {
      await supabase.storage.from('notebook-outputs').remove(outPaths)
    }

    await supabase.from('notebooks').delete().eq('id', req.params.id).eq('user_id', userId)

    return { ok: true }
  })
}
