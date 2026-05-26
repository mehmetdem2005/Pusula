import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { supabase, verifyUserToken } from '../supabase.js'

/**
 * Books Routes — Kitap kütüphanesi, ilerleme, oturumlar
 * =====================================================
 */

const CreateBookSchema = z.object({
  title: z.string().min(1).max(300),
  author: z.string().max(200).optional(),
  language: z.string().length(2),
  format: z.enum(['epub', 'pdf', 'txt']),
  storagePath: z.string().optional(), // user upload
  libraryDocumentId: z.string().uuid().optional(),
  totalPages: z.number().int().positive().optional(),
  totalWords: z.number().int().positive().optional(),
  coverUrl: z.string().url().optional(),
})

const UpdateProgressSchema = z.object({
  currentCfi: z.string().optional(),
  currentPage: z.number().int().nonnegative().optional(),
  currentPosition: z.number().min(0).max(1).optional(),
  readSeconds: z.number().int().nonnegative().default(0),
})

const StartSessionSchema = z.object({
  bookId: z.string().uuid(),
  startPosition: z.number().min(0).max(1),
})

const EndSessionSchema = z.object({
  sessionId: z.string().uuid(),
  endPosition: z.number().min(0).max(1),
  wordsLookedUp: z.number().int().nonnegative().default(0),
  sentencesTranslated: z.number().int().nonnegative().default(0),
  wordsAddedToVocab: z.number().int().nonnegative().default(0),
})

const CreateBookmarkSchema = z.object({
  bookId: z.string().uuid(),
  cfi: z.string().optional(),
  page: z.number().int().optional(),
  position: z.number().min(0).max(1).optional(),
  selectedText: z.string().max(2000).optional(),
  note: z.string().max(2000).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .default('#F59E0B'),
})

export async function booksRoutes(fastify: FastifyInstance) {
  /** POST /api/books/upload-url - PDF/EPUB için signed URL */
  fastify.post<{ Body: { fileName: string; format: 'epub' | 'pdf' | 'txt' } }>(
    '/api/books/upload-url',
    async (req, reply) => {
      const userId = await verifyUserToken(req.headers.authorization)
      if (!userId) return reply.code(401).send({ error: 'unauthorized' })

      const fileExt =
        req.body.format === 'epub' ? 'epub' : req.body.format === 'pdf' ? 'pdf' : 'txt'
      const fileName = `${userId}/${Date.now()}-${crypto.randomUUID()}.${fileExt}`

      const { data, error } = await supabase.storage.from('books').createSignedUploadUrl(fileName)

      if (error) return reply.code(500).send({ error: error.message })

      return {
        uploadUrl: data.signedUrl,
        storagePath: fileName,
        token: data.token,
      }
    },
  )

  /** POST /api/books — kitap kaydını oluştur */
  fastify.post('/api/books', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const parsed = CreateBookSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.format() })

    // Free tier limiti — aylık 5 kitap
    const { data: ent } = await supabase
      .from('user_entitlements')
      .select('is_pro')
      .eq('user_id', userId)
      .single()

    if (!ent?.is_pro) {
      const monthStart = new Date()
      monthStart.setDate(1)
      monthStart.setHours(0, 0, 0, 0)
      const { count } = await supabase
        .from('books')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', monthStart.toISOString())

      if ((count ?? 0) >= 5) {
        return reply.code(403).send({
          error: 'free_limit',
          message: "Free üyeler ayda 5 kitap yükleyebilir. Pro'ya geç, sınırsız aç.",
        })
      }
    }

    const estimatedMinutes = parsed.data.totalWords
      ? Math.ceil(parsed.data.totalWords / 200) // ortalama okuma hızı
      : null

    const { data, error } = await supabase
      .from('books')
      .insert({
        user_id: userId,
        title: parsed.data.title,
        author: parsed.data.author,
        language: parsed.data.language,
        format: parsed.data.format,
        storage_path: parsed.data.storagePath,
        library_document_id: parsed.data.libraryDocumentId,
        total_pages: parsed.data.totalPages,
        total_words: parsed.data.totalWords,
        estimated_minutes: estimatedMinutes,
        cover_url: parsed.data.coverUrl,
        status: 'not_started',
      })
      .select()
      .single()

    if (error) return reply.code(500).send({ error: error.message })

    return { book: data }
  })

  /** GET /api/books — kullanıcının kütüphanesi */
  fastify.get<{ Querystring: { status?: string; language?: string; limit?: string } }>(
    '/api/books',
    async (req, reply) => {
      const userId = await verifyUserToken(req.headers.authorization)
      if (!userId) return reply.code(401).send({ error: 'unauthorized' })

      let query = supabase
        .from('books')
        .select('*')
        .eq('user_id', userId)
        .order('last_read_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(Math.min(Number.parseInt(req.query.limit ?? '50'), 200))

      if (req.query.status) query = query.eq('status', req.query.status)
      if (req.query.language) query = query.eq('language', req.query.language)

      const { data } = await query
      return { books: data ?? [] }
    },
  )

  /** GET /api/books/:id */
  fastify.get<{ Params: { id: string } }>('/api/books/:id', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const { data: book } = await supabase
      .from('books')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', userId)
      .single()

    if (!book) return reply.code(404).send({ error: 'not_found' })

    // Bookmarks
    const { data: bookmarks } = await supabase
      .from('book_bookmarks')
      .select('*')
      .eq('book_id', req.params.id)
      .order('created_at', { ascending: false })

    // Vocab learned from this book
    const { count: vocabCount } = await supabase
      .from('user_vocabulary')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('source_book_id', req.params.id)

    return { book, bookmarks: bookmarks ?? [], vocabularyCount: vocabCount ?? 0 }
  })

  /** PATCH /api/books/:id/progress */
  fastify.patch<{ Params: { id: string } }>('/api/books/:id/progress', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const parsed = UpdateProgressSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.format() })

    const updates: any = {
      last_read_at: new Date().toISOString(),
      status: 'reading',
    }
    if (parsed.data.currentCfi !== undefined) updates.current_cfi = parsed.data.currentCfi
    if (parsed.data.currentPage !== undefined) updates.current_page = parsed.data.currentPage
    if (parsed.data.currentPosition !== undefined) {
      updates.current_position = parsed.data.currentPosition
      if (parsed.data.currentPosition >= 0.99) {
        updates.status = 'finished'
      }
    }

    if (parsed.data.readSeconds > 0) {
      // increment via RPC
      await supabase.rpc('increment_book_reading_time', {
        p_book_id: req.params.id,
        p_user_id: userId,
        p_seconds: parsed.data.readSeconds,
      })
    }

    const { error } = await supabase
      .from('books')
      .update(updates)
      .eq('id', req.params.id)
      .eq('user_id', userId)

    if (error) return reply.code(500).send({ error: error.message })

    return { ok: true }
  })

  /** DELETE /api/books/:id */
  fastify.delete<{ Params: { id: string } }>('/api/books/:id', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const { data: book } = await supabase
      .from('books')
      .select('storage_path')
      .eq('id', req.params.id)
      .eq('user_id', userId)
      .single()

    if (book?.storage_path) {
      await supabase.storage.from('books').remove([book.storage_path])
    }

    await supabase.from('books').delete().eq('id', req.params.id).eq('user_id', userId)
    return { ok: true }
  })

  // ============ READING SESSIONS ============

  /** POST /api/reading-sessions/start */
  fastify.post('/api/reading-sessions/start', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const parsed = StartSessionSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.format() })

    const { data, error } = await supabase
      .from('reading_sessions')
      .insert({
        user_id: userId,
        book_id: parsed.data.bookId,
        start_position: parsed.data.startPosition,
      })
      .select()
      .single()

    if (error) return reply.code(500).send({ error: error.message })
    return { session: data }
  })

  /** POST /api/reading-sessions/end */
  fastify.post('/api/reading-sessions/end', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const parsed = EndSessionSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.format() })

    const { data: session } = await supabase
      .from('reading_sessions')
      .select('started_at')
      .eq('id', parsed.data.sessionId)
      .eq('user_id', userId)
      .single()

    if (!session) return reply.code(404).send({ error: 'session_not_found' })

    const startedAt = new Date(session.started_at).getTime()
    const durationSec = Math.floor((Date.now() - startedAt) / 1000)

    await supabase
      .from('reading_sessions')
      .update({
        ended_at: new Date().toISOString(),
        duration_seconds: durationSec,
        end_position: parsed.data.endPosition,
        words_looked_up: parsed.data.wordsLookedUp,
        sentences_translated: parsed.data.sentencesTranslated,
        words_added_to_vocab: parsed.data.wordsAddedToVocab,
      })
      .eq('id', parsed.data.sessionId)

    return { ok: true, durationSeconds: durationSec }
  })

  // ============ BOOKMARKS ============

  /** POST /api/bookmarks */
  fastify.post('/api/bookmarks', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const parsed = CreateBookmarkSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.format() })

    const { data, error } = await supabase
      .from('book_bookmarks')
      .insert({
        user_id: userId,
        book_id: parsed.data.bookId,
        cfi: parsed.data.cfi,
        page: parsed.data.page,
        position: parsed.data.position,
        selected_text: parsed.data.selectedText,
        note: parsed.data.note,
        color: parsed.data.color,
      })
      .select()
      .single()

    if (error) return reply.code(500).send({ error: error.message })
    return { bookmark: data }
  })

  /** DELETE /api/bookmarks/:id */
  fastify.delete<{ Params: { id: string } }>('/api/bookmarks/:id', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    await supabase.from('book_bookmarks').delete().eq('id', req.params.id).eq('user_id', userId)
    return { ok: true }
  })

  // ============ STATS ============

  /** GET /api/books/:id/stats - okuma istatistikleri */
  fastify.get<{ Params: { id: string } }>('/api/books/:id/stats', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const { data: book } = await supabase
      .from('books')
      .select('total_reading_seconds, current_position, total_words, estimated_minutes')
      .eq('id', req.params.id)
      .eq('user_id', userId)
      .single()

    if (!book) return reply.code(404).send({ error: 'not_found' })

    const { data: sessions } = await supabase
      .from('reading_sessions')
      .select('duration_seconds, words_looked_up, words_added_to_vocab, started_at')
      .eq('book_id', req.params.id)
      .eq('user_id', userId)
      .order('started_at', { ascending: false })
      .limit(30)

    const totalLookups = (sessions ?? []).reduce((s, x: any) => s + (x.words_looked_up ?? 0), 0)
    const totalAdded = (sessions ?? []).reduce((s, x: any) => s + (x.words_added_to_vocab ?? 0), 0)

    return {
      totalReadingSeconds: book.total_reading_seconds ?? 0,
      progress: book.current_position ?? 0,
      estimatedMinutes: book.estimated_minutes,
      sessionsCount: sessions?.length ?? 0,
      totalWordsLookedUp: totalLookups,
      totalWordsAddedToVocab: totalAdded,
      recentSessions: (sessions ?? []).slice(0, 7).map((s: any) => ({
        date: s.started_at?.split('T')[0],
        duration: s.duration_seconds,
        lookups: s.words_looked_up,
      })),
    }
  })
}
