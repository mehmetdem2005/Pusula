import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { supabase, verifyUserToken } from '../supabase.js'

/**
 * YouTube Transcript Translation
 * ===============================
 *
 * Chunk-level translation kullanıyoruz çünkü:
 *   - Tüm transcript bir kerede çevrilirse zaman damgaları kayar
 *   - Cache hit: aynı chunk daha önce çevrildiyse instant
 *   - Streaming progress: kullanıcıya "%30 çevrildi" gösterebiliriz
 *
 * Gemini 2.0 Flash kullanılıyor — Türkçe için kalite + maliyet sweet spot.
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY

const TranslateSchema = z.object({
  sourceId: z.string().uuid(),
  targetLanguage: z.string().min(2).max(10), // 'tr', 'en', 'es', vb.
})

const SUPPORTED_LANGUAGES: Record<string, string> = {
  tr: 'Turkish',
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese',
  ru: 'Russian',
  ja: 'Japanese',
  ko: 'Korean',
  zh: 'Chinese',
  ar: 'Arabic',
}

async function translateBatch(
  chunks: Array<{ index: number; text: string }>,
  targetLanguageName: string,
  sourceLanguage: string,
): Promise<Record<number, string>> {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not configured')

  // Chunk'ları numaralı listede gönder
  const numbered = chunks.map((c) => `[${c.index}] ${c.text}`).join('\n\n')

  const prompt = `You are a professional translator. Translate the following numbered transcript chunks from ${sourceLanguage} to ${targetLanguageName}.

CRITICAL RULES:
- Preserve the exact numbering format [N] at the start of each chunk
- Keep proper nouns, brand names, and technical terms in original form when appropriate
- Use natural, conversational language (this is spoken transcript, not formal text)
- DO NOT add commentary, explanations, or summaries
- Return ONLY the translated chunks with their numbers

Source chunks:

${numbered}

Translated chunks (same format, same count):`

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2, // düşük: tutarlı çeviri
          maxOutputTokens: 8192,
        },
      }),
    },
  )

  if (!res.ok) throw new Error(`Gemini: ${res.status} ${await res.text()}`)
  const data: any = await res.json()
  const translatedText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

  // Parse [N] markers
  const result: Record<number, string> = {}
  const matches = translatedText.matchAll(/\[(\d+)\]\s*([\s\S]*?)(?=\n\[\d+\]|\n*$)/g)
  for (const m of matches) {
    const idx = Number.parseInt(m[1])
    const text = m[2].trim()
    if (text) result[idx] = text
  }

  return result
}

export async function translationsRoutes(fastify: FastifyInstance) {
  /** GET /api/translations/:sourceId/:lang */
  fastify.get<{ Params: { sourceId: string; lang: string } }>(
    '/api/translations/:sourceId/:lang',
    async (req, reply) => {
      const userId = await verifyUserToken(req.headers.authorization)
      if (!userId) return reply.code(401).send({ error: 'unauthorized' })

      const { data } = await supabase
        .from('youtube_translation_cache')
        .select('*')
        .eq('source_id', req.params.sourceId)
        .eq('user_id', userId)
        .eq('target_language', req.params.lang)
        .single()

      return { translation: data }
    },
  )

  /** POST /api/translations */
  fastify.post('/api/translations', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const parsed = TranslateSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.format() })

    const { sourceId, targetLanguage } = parsed.data

    // Source kontrol
    const { data: source } = await supabase
      .from('notebook_sources')
      .select('id, language, source_type')
      .eq('id', sourceId)
      .eq('user_id', userId)
      .single()

    if (!source) return reply.code(404).send({ error: 'source_not_found' })
    if (source.source_type !== 'youtube') {
      return reply.code(400).send({ error: 'youtube_only' })
    }

    const sourceLanguage = source.language ?? 'en'
    if (sourceLanguage === targetLanguage) {
      return reply.code(400).send({ error: 'same_language' })
    }

    if (!SUPPORTED_LANGUAGES[targetLanguage]) {
      return reply.code(400).send({ error: 'unsupported_language' })
    }

    // Cache check
    const { data: cached } = await supabase
      .from('youtube_translation_cache')
      .select('*')
      .eq('source_id', sourceId)
      .eq('target_language', targetLanguage)
      .single()

    if (cached?.status === 'ready') {
      return { translation: cached, cached: true }
    }

    // Pro check
    const { data: ent } = await supabase
      .from('user_entitlements')
      .select('is_pro')
      .eq('user_id', userId)
      .single()

    if (!ent?.is_pro) {
      return reply.code(402).send({ error: 'pro_required', message: 'Çeviri Pro özelliğidir.' })
    }

    // Chunks fetch
    const { data: chunks } = await supabase
      .from('source_chunks')
      .select('chunk_index, text')
      .eq('source_id', sourceId)
      .eq('user_id', userId)
      .order('chunk_index', { ascending: true })

    if (!chunks || chunks.length === 0) {
      return reply.code(400).send({ error: 'no_chunks' })
    }

    // Cache row oluştur
    const { data: cacheRow } = await supabase
      .from('youtube_translation_cache')
      .upsert(
        {
          source_id: sourceId,
          user_id: userId,
          source_language: sourceLanguage,
          target_language: targetLanguage,
          total_chunks: chunks.length,
          translated_chunks: 0,
          status: 'processing',
          translations: {},
        },
        { onConflict: 'source_id,target_language' },
      )
      .select()
      .single()

    // Async translation (don't block response)
    void (async () => {
      try {
        // Batch 10 chunk birlikte (token tasarrufu)
        const BATCH = 10
        const allTranslations: Record<string, string> = {}

        for (let i = 0; i < chunks.length; i += BATCH) {
          const batch = chunks.slice(i, i + BATCH).map((c) => ({
            index: c.chunk_index,
            text: c.text,
          }))

          const translated = await translateBatch(
            batch,
            SUPPORTED_LANGUAGES[targetLanguage] ?? targetLanguage,
            SUPPORTED_LANGUAGES[sourceLanguage] ?? sourceLanguage,
          )

          for (const [idx, txt] of Object.entries(translated)) {
            allTranslations[idx] = txt
          }

          // Progress update
          await supabase
            .from('youtube_translation_cache')
            .update({
              translations: allTranslations,
              translated_chunks: Object.keys(allTranslations).length,
              updated_at: new Date().toISOString(),
            })
            .eq('id', cacheRow!.id)
        }

        // Done
        await supabase
          .from('youtube_translation_cache')
          .update({ status: 'ready', updated_at: new Date().toISOString() })
          .eq('id', cacheRow!.id)
      } catch (e: any) {
        fastify.log.error(e, 'Translation failed')
        await supabase
          .from('youtube_translation_cache')
          .update({ status: 'failed' })
          .eq('id', cacheRow!.id)
      }
    })()

    return { translation: cacheRow, started: true }
  })

  /** DELETE /api/translations/:sourceId/:lang */
  fastify.delete<{ Params: { sourceId: string; lang: string } }>(
    '/api/translations/:sourceId/:lang',
    async (req, reply) => {
      const userId = await verifyUserToken(req.headers.authorization)
      if (!userId) return reply.code(401).send({ error: 'unauthorized' })

      await supabase
        .from('youtube_translation_cache')
        .delete()
        .eq('source_id', req.params.sourceId)
        .eq('user_id', userId)
        .eq('target_language', req.params.lang)

      return { ok: true }
    },
  )
}
