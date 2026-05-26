import crypto from 'node:crypto'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { defaultVoiceForLanguage, edgeTTS } from '../edge-tts.js'
import { supabase, verifyUserToken } from '../supabase.js'

/**
 * Book TTS Routes — sentence-level audio + word timings
 * ======================================================
 *
 * Curated katalog kitaplarında audio cache (book_id, voice_id) anahtarı ile shared.
 * User-uploaded kitaplarda audio per-user cache (storage path: user_id/book_id/...).
 *
 * 3 motor:
 *  - edge: ücretsiz Microsoft Edge TTS (free tier default)
 *  - elevenlabs: Pro tier, /with-timestamps endpoint ile karakter alignment
 *  - piper: tamamen offline (worker-voice'a ait)
 *
 * Word-level timings karaoke vurgu için kullanılır.
 */

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY

const SynthesizeSentenceSchema = z.object({
  text: z.string().min(1).max(2000),
  language: z.string().length(2),
  voiceId: z.string().optional(),
  engine: z.enum(['edge', 'elevenlabs']).default('edge'),
  bookId: z.string().uuid().optional(),
  sentenceId: z.string().uuid().optional(),
})

const SynthesizeChapterSchema = z.object({
  bookId: z.string().uuid(),
  chapterIndex: z.number().int().nonnegative(),
  sentences: z
    .array(
      z.object({
        text: z.string().min(1),
        sentenceIndex: z.number().int().nonnegative(),
      }),
    )
    .min(1)
    .max(200),
  language: z.string().length(2),
  voiceId: z.string().optional(),
  engine: z.enum(['edge', 'elevenlabs']).default('edge'),
})

interface WordTiming {
  word: string
  startMs: number
  endMs: number
}

interface SentenceAudioResult {
  audioUrl: string
  durationMs: number
  wordTimings: WordTiming[]
  source: 'cache' | 'edge' | 'elevenlabs'
}

// ===== ElevenLabs with-timestamps =====

async function elevenLabsWithTimestamps(
  text: string,
  voiceId: string,
): Promise<{ audio: Buffer; alignment: any }> {
  if (!ELEVENLABS_API_KEY) throw new Error('ElevenLabs not configured')

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    },
  )

  if (!res.ok) throw new Error(`ElevenLabs error: ${res.status}`)

  const data: any = await res.json()
  // ElevenLabs returns: { audio_base64, alignment: { characters, character_start_times_seconds, character_end_times_seconds } }
  const audio = Buffer.from(data.audio_base64, 'base64')
  return { audio, alignment: data.alignment }
}

/**
 * ElevenLabs character-level → word-level timings
 */
function characterAlignmentToWords(text: string, alignment: any): WordTiming[] {
  if (!alignment?.characters) return []

  const chars: string[] = alignment.characters
  const starts: number[] = alignment.character_start_times_seconds
  const ends: number[] = alignment.character_end_times_seconds

  const words: WordTiming[] = []
  let currentWord = ''
  let wordStart = -1
  let wordEnd = 0

  for (let i = 0; i < chars.length; i++) {
    const c = chars[i] ?? ''
    if (/\s/.test(c)) {
      if (currentWord.length > 0 && wordStart >= 0) {
        words.push({
          word: currentWord,
          startMs: Math.round(wordStart * 1000),
          endMs: Math.round(wordEnd * 1000),
        })
        currentWord = ''
        wordStart = -1
      }
    } else {
      if (currentWord === '') wordStart = starts[i] ?? 0
      currentWord += c
      wordEnd = ends[i] ?? wordEnd
    }
  }
  if (currentWord && wordStart >= 0) {
    words.push({
      word: currentWord,
      startMs: Math.round(wordStart * 1000),
      endMs: Math.round(wordEnd * 1000),
    })
  }

  return words
}

/**
 * Edge TTS için word timings tahmini.
 * Edge TTS resmi olarak word boundary event vermiyor — duration'a göre ortalama
 * kelime başına süre hesaplanıyor. Gerçek anlamda karaoke alignment için ElevenLabs şart.
 */
function estimateWordTimings(text: string, durationMs: number): WordTiming[] {
  const words = text.match(/\S+/g) ?? []
  if (words.length === 0) return []

  const totalChars = text.replace(/\s+/g, '').length
  const msPerChar = durationMs / totalChars

  let cursor = 0
  return words.map((w) => {
    const wordChars = w.length
    const start = cursor * msPerChar
    cursor += wordChars
    const end = cursor * msPerChar
    return {
      word: w,
      startMs: Math.round(start),
      endMs: Math.round(end),
    }
  })
}

function makeCacheKey(text: string, voiceId: string, lang: string): string {
  return crypto.createHash('sha256').update(`${voiceId}|${lang}|${text}`).digest('hex')
}

async function getCachedSentenceAudio(
  bookId: string | undefined,
  sentenceId: string | undefined,
  text: string,
  voiceId: string,
  language: string,
): Promise<SentenceAudioResult | null> {
  // Önce sentence_id varsa book_sentences tablosundan
  if (sentenceId) {
    const { data } = await supabase
      .from('book_sentences')
      .select('audio_url, duration_ms, word_timings, tts_voice_id')
      .eq('id', sentenceId)
      .eq('tts_voice_id', voiceId)
      .maybeSingle()

    if (data?.audio_url) {
      const { data: urlData } = await supabase.storage
        .from('book-audio')
        .createSignedUrl(data.audio_url, 3600)

      return {
        audioUrl: urlData?.signedUrl ?? data.audio_url,
        durationMs: data.duration_ms ?? 0,
        wordTimings: data.word_timings ?? [],
        source: 'cache',
      }
    }
  }

  // Hash bazlı cache (book_sentences yoksa)
  const cacheKey = makeCacheKey(text, voiceId, language)
  const cachePath = `cache/${cacheKey}.mp3`

  const { data: fileExists } = await supabase.storage.from('book-audio').list('cache', {
    search: `${cacheKey}.mp3`,
    limit: 1,
  })

  if (fileExists && fileExists.length > 0) {
    const { data: urlData } = await supabase.storage
      .from('book-audio')
      .createSignedUrl(cachePath, 3600)

    // Word timings json yan dosya
    const { data: timingsBlob } = await supabase.storage
      .from('book-audio')
      .download(`cache/${cacheKey}.json`)

    let timings: WordTiming[] = []
    let durationMs = 0
    if (timingsBlob) {
      try {
        const meta = JSON.parse(await timingsBlob.text())
        timings = meta.wordTimings ?? []
        durationMs = meta.durationMs ?? 0
      } catch {}
    }

    return {
      audioUrl: urlData?.signedUrl ?? cachePath,
      durationMs,
      wordTimings: timings,
      source: 'cache',
    }
  }

  return null
}

async function uploadSentenceAudio(
  cacheKey: string,
  audio: Buffer,
  meta: { durationMs: number; wordTimings: WordTiming[] },
): Promise<string> {
  const path = `cache/${cacheKey}.mp3`
  const metaPath = `cache/${cacheKey}.json`

  await supabase.storage.from('book-audio').upload(path, audio, {
    contentType: 'audio/mpeg',
    upsert: true,
  })
  await supabase.storage
    .from('book-audio')
    .upload(metaPath, Buffer.from(JSON.stringify(meta)), {
      contentType: 'application/json',
      upsert: true,
    })

  return path
}

// ===== Routes =====

export async function bookTTSRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/books/tts/sentence
   * Tek cümle TTS — anlık dinleme + word timings.
   */
  fastify.post('/api/books/tts/sentence', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const parsed = SynthesizeSentenceSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.format() })

    const { text, language, voiceId, engine, bookId, sentenceId } = parsed.data

    // ElevenLabs Pro guard
    if (engine === 'elevenlabs') {
      const { data: ent } = await supabase
        .from('user_entitlements')
        .select('is_pro')
        .eq('user_id', userId)
        .single()
      if (!ent?.is_pro) {
        return reply.code(403).send({
          error: 'pro_required',
          message: "ElevenLabs karaoke alignment Pro özelliği. Edge TTS'i kullan.",
        })
      }
    }

    const selectedVoice = voiceId ?? defaultVoiceForLanguage(language)
    const cacheKey = makeCacheKey(text, selectedVoice, language)

    // 1. Cache check
    const cached = await getCachedSentenceAudio(bookId, sentenceId, text, selectedVoice, language)
    if (cached) return cached

    // 2. Generate
    let audio: Buffer
    let wordTimings: WordTiming[] = []
    let durationMs = 0

    try {
      if (engine === 'elevenlabs') {
        const result = await elevenLabsWithTimestamps(text, selectedVoice)
        audio = result.audio
        wordTimings = characterAlignmentToWords(text, result.alignment)
        durationMs =
          wordTimings.length > 0
            ? (wordTimings[wordTimings.length - 1]?.endMs ?? 0)
            : Math.round(audio.length / 24) // 24kbps mp3 rough estimate
      } else {
        // Edge TTS
        audio = await edgeTTS({ text, voice: selectedVoice })
        // Edge TTS doesn't expose word boundaries; estimate based on duration
        // 24kHz 48kbps mp3 → ~6KB/sec
        durationMs = Math.round((audio.length / 6000) * 1000)
        wordTimings = estimateWordTimings(text, durationMs)
      }
    } catch (err: any) {
      fastify.log.error(err, 'TTS hata')
      return reply.code(500).send({ error: 'tts_failed', message: err.message })
    }

    // 3. Upload + cache meta
    try {
      const audioPath = await uploadSentenceAudio(cacheKey, audio, { durationMs, wordTimings })

      // Update book_sentences if sentenceId provided
      if (sentenceId) {
        await supabase
          .from('book_sentences')
          .update({
            audio_url: audioPath,
            duration_ms: durationMs,
            word_timings: wordTimings,
            tts_voice_id: selectedVoice,
          })
          .eq('id', sentenceId)
      }

      const { data: urlData } = await supabase.storage
        .from('book-audio')
        .createSignedUrl(audioPath, 3600)

      return {
        audioUrl: urlData?.signedUrl ?? audioPath,
        durationMs,
        wordTimings,
        source: engine,
      }
    } catch (err: any) {
      fastify.log.error(err, 'Storage hata')
      return reply.code(500).send({ error: 'storage_failed' })
    }
  })

  /**
   * POST /api/books/tts/chapter
   * Bir chapter'ın tüm cümlelerini batch olarak hazırla.
   * Ön-yükleme için (kullanıcı sayfayı açtığında arka planda).
   */
  fastify.post('/api/books/tts/chapter', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const parsed = SynthesizeChapterSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.format() })

    const { bookId, chapterIndex, sentences, language, voiceId, engine } = parsed.data
    const selectedVoice = voiceId ?? defaultVoiceForLanguage(language)

    // Async iş — sırayla cümleleri üret, başlamış olanları döndür
    const results = await Promise.all(
      sentences.map(async (s) => {
        const cacheKey = makeCacheKey(s.text, selectedVoice, language)
        const cached = await getCachedSentenceAudio(
          undefined,
          undefined,
          s.text,
          selectedVoice,
          language,
        )
        if (cached) {
          return { sentenceIndex: s.sentenceIndex, ...cached }
        }
        // Edge engine'de paralel üretim güvenli, ElevenLabs'ta rate limit var
        if (engine === 'edge') {
          try {
            const audio = await edgeTTS({ text: s.text, voice: selectedVoice })
            const durationMs = Math.round((audio.length / 6000) * 1000)
            const wordTimings = estimateWordTimings(s.text, durationMs)
            const audioPath = await uploadSentenceAudio(cacheKey, audio, {
              durationMs,
              wordTimings,
            })

            const { data: urlData } = await supabase.storage
              .from('book-audio')
              .createSignedUrl(audioPath, 3600)

            return {
              sentenceIndex: s.sentenceIndex,
              audioUrl: urlData?.signedUrl ?? audioPath,
              durationMs,
              wordTimings,
              source: 'edge',
            }
          } catch {
            return { sentenceIndex: s.sentenceIndex, error: 'tts_failed' }
          }
        }
        // ElevenLabs lazy (sıraya koy)
        return { sentenceIndex: s.sentenceIndex, deferred: true }
      }),
    )

    return { sentences: results }
  })

  /** GET /api/books/tts/settings - kullanıcı ayarları */
  fastify.get('/api/books/tts/settings', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const { data } = await supabase
      .from('book_tts_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    return (
      data ?? {
        engine: 'edge',
        voice_id: null,
        speed: 1.0,
        pitch: 0,
        highlight_color: '#F59E0B',
        highlight_mode: 'word',
        auto_advance: true,
      }
    )
  })

  /** PUT /api/books/tts/settings */
  fastify.put('/api/books/tts/settings', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const schema = z.object({
      engine: z.enum(['edge', 'piper', 'elevenlabs', 'azure']).optional(),
      voice_id: z.string().nullable().optional(),
      speed: z.number().min(0.5).max(3.0).optional(),
      pitch: z.number().optional(),
      highlight_color: z
        .string()
        .regex(/^#[0-9A-Fa-f]{6}$/)
        .optional(),
      highlight_mode: z.enum(['word', 'sentence', 'off']).optional(),
      auto_advance: z.boolean().optional(),
    })
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.format() })

    await supabase.from('book_tts_settings').upsert({
      user_id: userId,
      ...parsed.data,
      updated_at: new Date().toISOString(),
    })

    return { ok: true }
  })
}
