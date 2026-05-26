import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { chunkYouTubeTranscript, extractVideoId, fetchYouTubeTranscript } from '../lib/youtube.js'
import { supabase, verifyUserToken } from '../supabase.js'

/**
 * Source Ingestion Routes — NotebookLM kaynakları
 * ================================================
 *
 * Akış:
 *   1. POST /api/sources/upload-url → signed URL (PDF/audio için)
 *   2. POST /api/sources → kaynak kaydı oluştur, processing kuyruğuna ekle
 *   3. POST /api/sources/:id/process → text extract + chunk + embed
 *
 * Kaynak tipleri:
 *   - pdf: pdf-parse / Mistral OCR (taranmış)
 *   - url: Jina Reader (https://r.jina.ai/...)
 *   - youtube: Supadata transcript + Whisper fallback (Sprint 4'te)
 *   - audio: Groq Whisper Large v3 Turbo
 *   - text: doğrudan içerik
 *   - epub/docx: text extract
 */

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const JINA_API_KEY = process.env.JINA_API_KEY

const CreateSourceSchema = z.object({
  notebookId: z.string().uuid(),
  sourceType: z.enum(['pdf', 'url', 'youtube', 'audio', 'text', 'epub', 'docx']),
  title: z.string().min(1).max(300),
  storagePath: z.string().optional(),
  externalUrl: z.string().url().optional(),
  rawText: z.string().max(500_000).optional(), // text source için 500kb max
  metadata: z.record(z.string(), z.any()).optional(),
})

// ===== Chunking =====

interface Chunk {
  text: string
  index: number
  pageNumber?: number
  sectionTitle?: string
  startChar?: number
  endChar?: number
  startTimeMs?: number
  endTimeMs?: number
}

/**
 * Heading-aware chunking. Default: ~700 token, 100 overlap.
 * Türkçe için her token ≈ 3.5 karakter (subtoken yüzünden).
 */
function chunkText(
  text: string,
  opts?: {
    maxChars?: number
    overlap?: number
  },
): Chunk[] {
  const maxChars = opts?.maxChars ?? 2500 // ~700 token TR
  const overlap = opts?.overlap ?? 350 // ~100 token

  if (text.length <= maxChars) {
    return [{ text, index: 0, startChar: 0, endChar: text.length }]
  }

  const chunks: Chunk[] = []
  let cursor = 0
  let idx = 0

  // Heading detection (Markdown-style, ya da boş satırla ayrılmış paragraflar)
  const lines = text.split('\n')
  let currentSection = ''

  while (cursor < text.length) {
    let end = Math.min(cursor + maxChars, text.length)

    // Cümle/paragraf sınırına kayma
    if (end < text.length) {
      const slice = text.slice(cursor, end)
      const lastPeriod = Math.max(
        slice.lastIndexOf('. '),
        slice.lastIndexOf('! '),
        slice.lastIndexOf('? '),
        slice.lastIndexOf('\n\n'),
      )
      if (lastPeriod > maxChars * 0.5) {
        end = cursor + lastPeriod + 1
      }
    }

    const chunkText = text.slice(cursor, end).trim()

    // Detect section title
    const sectionMatch = chunkText.match(/^(#{1,3}\s+.+)$/m)
    if (sectionMatch?.[1]) currentSection = sectionMatch[1].replace(/^#+\s+/, '')

    chunks.push({
      text: chunkText,
      index: idx++,
      startChar: cursor,
      endChar: end,
      sectionTitle: currentSection || undefined,
    })

    cursor = Math.max(end - overlap, cursor + 1)
  }

  return chunks
}

// ===== Embeddings =====

async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not configured')

  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: texts,
      dimensions: 1536,
    }),
  })

  if (!res.ok) throw new Error(`Embedding API: ${res.status} ${await res.text()}`)

  const data: any = await res.json()
  return data.data.map((d: any) => d.embedding)
}

// ===== Text extraction =====

async function extractFromUrl(url: string): Promise<string> {
  // Jina Reader: https://r.jina.ai/{url} - markdown çıktı
  const headers: Record<string, string> = {}
  if (JINA_API_KEY) headers.Authorization = `Bearer ${JINA_API_KEY}`

  const res = await fetch(`https://r.jina.ai/${url}`, { headers })
  if (!res.ok) throw new Error(`Jina Reader: ${res.status}`)
  return await res.text()
}

async function extractFromPdf(storagePath: string): Promise<{ text: string; pageCount: number }> {
  // PDF'i indir + pdf-parse ile extract
  // (production'da Mistral OCR fallback için worker-llm/lib/pdf.ts kullan)
  const { data: blob } = await supabase.storage.from('notebook-sources').download(storagePath)
  if (!blob) throw new Error('PDF indirilemedi')

  const arrayBuffer = await blob.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  // Dynamic import (pdf-parse heavy)
  const pdfParse = (await import('pdf-parse')).default
  const result = await pdfParse(buffer)

  return {
    text: result.text,
    pageCount: result.numpages,
  }
}

async function extractFromAudio(
  storagePath: string,
): Promise<{ text: string; durationMs: number }> {
  // Groq Whisper Large v3 Turbo
  const groqKey = process.env.GROQ_API_KEY
  if (!groqKey) throw new Error('GROQ_API_KEY not configured')

  const { data: blob } = await supabase.storage.from('notebook-sources').download(storagePath)
  if (!blob) throw new Error('Audio dosyası indirilemedi')

  const formData = new FormData()
  formData.append('file', blob, 'audio.mp3')
  formData.append('model', 'whisper-large-v3-turbo')
  formData.append('response_format', 'verbose_json')

  const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${groqKey}` },
    body: formData,
  })

  if (!res.ok) throw new Error(`Groq Whisper: ${res.status}`)
  const data: any = await res.json()

  return {
    text: data.text,
    durationMs: Math.round((data.duration ?? 0) * 1000),
  }
}

// ===== Routes =====

export async function sourcesRoutes(fastify: FastifyInstance) {
  /** POST /api/sources/upload-url */
  fastify.post<{ Body: { fileName: string; mimeType?: string } }>(
    '/api/sources/upload-url',
    async (req, reply) => {
      const userId = await verifyUserToken(req.headers.authorization)
      if (!userId) return reply.code(401).send({ error: 'unauthorized' })

      const fileName = `${userId}/${Date.now()}-${crypto.randomUUID()}-${req.body.fileName}`
      const { data, error } = await supabase.storage
        .from('notebook-sources')
        .createSignedUploadUrl(fileName)

      if (error) return reply.code(500).send({ error: error.message })

      return {
        uploadUrl: data.signedUrl,
        storagePath: fileName,
        token: data.token,
      }
    },
  )

  /** POST /api/sources — kaynak kaydı oluştur */
  fastify.post('/api/sources', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const parsed = CreateSourceSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.format() })

    // Notebook ownership
    const { data: notebook } = await supabase
      .from('notebooks')
      .select('id, language')
      .eq('id', parsed.data.notebookId)
      .eq('user_id', userId)
      .single()

    if (!notebook) return reply.code(404).send({ error: 'notebook_not_found' })

    // Free tier: 5 source per notebook
    const { data: ent } = await supabase
      .from('user_entitlements')
      .select('is_pro')
      .eq('user_id', userId)
      .single()

    if (!ent?.is_pro) {
      const { count } = await supabase
        .from('notebook_sources')
        .select('*', { count: 'exact', head: true })
        .eq('notebook_id', parsed.data.notebookId)

      if ((count ?? 0) >= 5) {
        return reply.code(403).send({
          error: 'free_limit',
          message: 'Free üyeler defter başına 5 kaynak ekleyebilir.',
        })
      }
    }

    const { data, error } = await supabase
      .from('notebook_sources')
      .insert({
        notebook_id: parsed.data.notebookId,
        user_id: userId,
        source_type: parsed.data.sourceType,
        title: parsed.data.title,
        storage_path: parsed.data.storagePath,
        external_url: parsed.data.externalUrl,
        raw_text: parsed.data.rawText,
        metadata: parsed.data.metadata ?? {},
        language: notebook.language,
        status: 'pending',
      })
      .select()
      .single()

    if (error) return reply.code(500).send({ error: error.message })

    // Background processing fire-and-forget
    setImmediate(async () => {
      try {
        await processSource(data.id, userId)
      } catch (e: any) {
        fastify.log.error(e, `Source process hata ${data.id}`)
      }
    })

    return { source: data }
  })

  /** POST /api/sources/:id/process — manual re-process */
  fastify.post<{ Params: { id: string } }>('/api/sources/:id/process', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const { data: source } = await supabase
      .from('notebook_sources')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', userId)
      .single()

    if (!source) return reply.code(404).send({ error: 'not_found' })

    setImmediate(async () => {
      try {
        await processSource(req.params.id, userId)
      } catch (e: any) {
        fastify.log.error(e, `Re-process hata`)
      }
    })

    return { ok: true, status: 'queued' }
  })

  /** GET /api/sources/:id */
  fastify.get<{ Params: { id: string } }>('/api/sources/:id', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const { data } = await supabase
      .from('notebook_sources')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', userId)
      .single()

    if (!data) return reply.code(404).send({ error: 'not_found' })
    return data
  })

  /** GET /api/sources/:id/chunks */
  fastify.get<{ Params: { id: string } }>('/api/sources/:id/chunks', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const { data } = await supabase
      .from('source_chunks')
      .select('id, chunk_index, text, page_number, section_title, start_time_ms, end_time_ms')
      .eq('source_id', req.params.id)
      .eq('user_id', userId)
      .order('chunk_index', { ascending: true })

    return { chunks: data ?? [] }
  })

  /** DELETE /api/sources/:id */
  fastify.delete<{ Params: { id: string } }>('/api/sources/:id', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const { data: source } = await supabase
      .from('notebook_sources')
      .select('storage_path, notebook_id')
      .eq('id', req.params.id)
      .eq('user_id', userId)
      .single()

    if (source?.storage_path) {
      await supabase.storage.from('notebook-sources').remove([source.storage_path])
    }

    await supabase.from('notebook_sources').delete().eq('id', req.params.id)

    if (source?.notebook_id) {
      await supabase.rpc('recount_notebook_aggregates', { p_notebook_id: source.notebook_id })
    }

    return { ok: true }
  })
}

// ===== Background processor =====

export async function processSource(sourceId: string, userId: string): Promise<void> {
  const { data: source } = await supabase
    .from('notebook_sources')
    .select('*')
    .eq('id', sourceId)
    .single()

  if (!source) return

  await supabase.from('notebook_sources').update({ status: 'processing' }).eq('id', sourceId)

  try {
    let text = ''
    let metadata = source.metadata ?? {}

    if (source.source_type === 'text' && source.raw_text) {
      text = source.raw_text
    } else if (source.source_type === 'url' && source.external_url) {
      text = await extractFromUrl(source.external_url)
    } else if (source.source_type === 'pdf' && source.storage_path) {
      const result = await extractFromPdf(source.storage_path)
      text = result.text
      metadata = { ...metadata, pageCount: result.pageCount }
    } else if (source.source_type === 'audio' && source.storage_path) {
      const result = await extractFromAudio(source.storage_path)
      text = result.text
      metadata = { ...metadata, durationMs: result.durationMs }
    } else if (source.source_type === 'youtube' && source.external_url) {
      // YouTube transcript fetch
      const result = await fetchYouTubeTranscript(source.external_url, source.language)
      text = result.fullText

      const videoId = extractVideoId(source.external_url)
      metadata = {
        ...metadata,
        videoId,
        durationSeconds: result.durationSeconds,
        transcriptSource: result.source,
        segmentCount: result.segments.length,
      }

      // YouTube için time-based chunking — chunk'lara timestamp eklenir
      const ytChunks = chunkYouTubeTranscript(result.segments)

      // Embed
      const BATCH = 32
      const allEmbeds: number[][] = []
      for (let i = 0; i < ytChunks.length; i += BATCH) {
        const batch = ytChunks.slice(i, i + BATCH)
        const embeddings = await generateEmbeddings(batch.map((c) => c.text))
        allEmbeds.push(...embeddings)
      }

      const inserts = ytChunks.map((c, i) => ({
        source_id: sourceId,
        notebook_id: source.notebook_id,
        user_id: userId,
        chunk_index: c.index,
        text: c.text,
        embedding: allEmbeds[i] as any,
        start_time_ms: c.startMs,
        end_time_ms: c.endMs,
        token_count: Math.ceil(c.text.length / 3.5),
      }))

      const INSERT_BATCH = 50
      for (let i = 0; i < inserts.length; i += INSERT_BATCH) {
        await supabase.from('source_chunks').insert(inserts.slice(i, i + INSERT_BATCH))
      }

      // YouTube-specific update
      await supabase
        .from('notebook_sources')
        .update({
          status: 'ready',
          processed_at: new Date().toISOString(),
          chunk_count: ytChunks.length,
          word_count: text.split(/\s+/).length,
          char_count: text.length,
          metadata,
          youtube_video_id: videoId,
          youtube_duration_seconds: result.durationSeconds,
          youtube_channel_name: result.channelName,
          transcript_source: result.source,
        })
        .eq('id', sourceId)

      await supabase.rpc('recount_notebook_aggregates', { p_notebook_id: source.notebook_id })
      return // YouTube path early return — chunking ayrı
    } else {
      throw new Error(`Unsupported source type or missing data: ${source.source_type}`)
    }

    if (!text || text.length < 50) {
      throw new Error('Kaynaktan yeterli metin çıkarılamadı')
    }

    // Chunk
    const chunks = chunkText(text)

    // Embed in batches
    const BATCH = 32
    const allEmbeds: number[][] = []
    for (let i = 0; i < chunks.length; i += BATCH) {
      const batch = chunks.slice(i, i + BATCH)
      const embeddings = await generateEmbeddings(batch.map((c) => c.text))
      allEmbeds.push(...embeddings)
    }

    // Insert chunks
    const inserts = chunks.map((c, i) => ({
      source_id: sourceId,
      notebook_id: source.notebook_id,
      user_id: userId,
      chunk_index: c.index,
      text: c.text,
      embedding: allEmbeds[i] as any, // pgvector accepts array
      page_number: c.pageNumber,
      section_title: c.sectionTitle,
      start_char: c.startChar,
      end_char: c.endChar,
      start_time_ms: c.startTimeMs,
      end_time_ms: c.endTimeMs,
      token_count: Math.ceil(c.text.length / 3.5),
    }))

    // Insert in batches (Supabase has row size limits)
    const INSERT_BATCH = 50
    for (let i = 0; i < inserts.length; i += INSERT_BATCH) {
      await supabase.from('source_chunks').insert(inserts.slice(i, i + INSERT_BATCH))
    }

    // Mark ready
    await supabase
      .from('notebook_sources')
      .update({
        status: 'ready',
        processed_at: new Date().toISOString(),
        chunk_count: chunks.length,
        word_count: text.split(/\s+/).length,
        char_count: text.length,
        metadata,
      })
      .eq('id', sourceId)

    // Recount notebook
    await supabase.rpc('recount_notebook_aggregates', { p_notebook_id: source.notebook_id })
  } catch (err: any) {
    await supabase
      .from('notebook_sources')
      .update({
        status: 'failed',
        error_message: err.message ?? 'Unknown error',
      })
      .eq('id', sourceId)
    console.error('Source processing hata:', err)
  }
}
