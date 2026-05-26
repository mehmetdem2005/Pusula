import crypto from 'node:crypto'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { supabase, verifyUserToken } from '../supabase.js'

/**
 * Dictionary Routes — Tap-to-Translate + Word Lookup + Sentence Translation
 * ==========================================================================
 *
 * 3 katmanlı sözlük:
 *   1. dictionary_cache (kalıcı, paylaşılır) — en hızlı
 *   2. Free Dictionary API (ücretsiz, sınırsız, sadece İngilizce) — IPA + tanım
 *   3. Gemini Flash fallback — bağlamsal çeviri + Türkçe (parametrelerle)
 *
 * Her lookup user_vocabulary'ye kaydedilir (kullanıcının kişisel dağarcığı).
 *
 * Sentence translation: ayrı endpoint, sentence_translation_cache kullanır.
 */

const FREE_DICT_API = 'https://api.dictionaryapi.dev/api/v2/entries'
const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GEMINI_FLASH = 'gemini-2.0-flash-exp'

const LookupWordSchema = z.object({
  word: z.string().min(1).max(50).trim(),
  sourceLang: z.string().length(2).default('en'),
  targetLang: z.string().length(2).default('tr'),
  context: z.string().max(500).optional(), // bağlam cümle (daha iyi çeviri için)
  bookId: z.string().uuid().optional(), // hangi kitaptan geldi
  sentenceText: z.string().max(500).optional(),
  saveToVocab: z.boolean().default(true),
})

const TranslateSentenceSchema = z.object({
  text: z.string().min(1).max(2000),
  sourceLang: z.string().length(2).default('en'),
  targetLang: z.string().length(2).default('tr'),
  literary: z.boolean().default(false), // Pro: edebi mod
})

const BatchLookupSchema = z.object({
  words: z.array(z.string().min(1).max(50)).min(1).max(20),
  sourceLang: z.string().length(2).default('en'),
  targetLang: z.string().length(2).default('tr'),
})

interface WordDefinition {
  partOfSpeech: string
  definition: string
  example?: string
  synonyms?: string[]
}

interface DictResult {
  word: string
  ipa?: string
  pronunciationAudioUrl?: string
  definitions: WordDefinition[]
  translations: string[]
  examples?: Array<{ source: string; translation: string }>
  source: 'cache' | 'free-dict' | 'gemini'
}

// ===== Free Dictionary API =====

async function fetchFreeDictionary(word: string, lang = 'en'): Promise<Partial<DictResult> | null> {
  try {
    const res = await fetch(`${FREE_DICT_API}/${lang}/${encodeURIComponent(word)}`)
    if (!res.ok) return null
    const data = (await res.json()) as any[]
    if (!data.length) return null

    const first = data[0]
    const phonetic = first.phonetics?.find((p: any) => p.text)?.text
    const audio = first.phonetics?.find((p: any) => p.audio)?.audio

    const definitions: WordDefinition[] = []
    for (const meaning of first.meanings ?? []) {
      for (const def of (meaning.definitions ?? []).slice(0, 2)) {
        definitions.push({
          partOfSpeech: meaning.partOfSpeech,
          definition: def.definition,
          example: def.example,
          synonyms: def.synonyms,
        })
      }
    }

    return {
      word: first.word,
      ipa: phonetic,
      pronunciationAudioUrl: audio,
      definitions: definitions.slice(0, 4),
    }
  } catch {
    return null
  }
}

// ===== Gemini ile bağlamsal sözlük + Türkçe çeviri =====

async function fetchGeminiDictionary(
  word: string,
  sourceLang: string,
  targetLang: string,
  context?: string,
): Promise<Partial<DictResult> | null> {
  if (!GEMINI_API_KEY) return null

  const prompt = `Sen bir sözlüksün. "${word}" kelimesini ${sourceLang} dilinden ${targetLang} diline çevir.
${context ? `\nBu cümle bağlamında: "${context}"\n` : ''}
JSON döndür, sadece JSON, başka metin ekleme:
{
  "ipa": "fonetik telaffuz, IPA",
  "definitions": [
    {"partOfSpeech": "noun|verb|adjective vb", "definition": "${targetLang} dilinde kısa tanım", "example": "${sourceLang} örnek cümle"}
  ],
  "translations": ["${targetLang} dilinde 1-3 çeviri"],
  "synonyms": ["${sourceLang} dilinde 2-3 eş anlamlı"]
}

Kelime: "${word}"`

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_FLASH}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: 'application/json',
          },
        }),
      },
    )

    if (!res.ok) return null
    const data: any = await res.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) return null

    const parsed = JSON.parse(text)
    return {
      word,
      ipa: parsed.ipa,
      definitions: parsed.definitions ?? [],
      translations: parsed.translations ?? [],
    }
  } catch {
    return null
  }
}

// ===== Cache helpers =====

async function getCached(
  word: string,
  sourceLang: string,
  targetLang: string,
): Promise<DictResult | null> {
  const { data } = await supabase
    .from('dictionary_cache')
    .select('*')
    .eq('word', word.toLowerCase())
    .eq('source_lang', sourceLang)
    .eq('target_lang', targetLang)
    .maybeSingle()

  if (!data) return null

  // Hit count güncelle
  await supabase
    .from('dictionary_cache')
    .update({ hit_count: data.hit_count + 1, last_used_at: new Date().toISOString() })
    .eq('id', data.id)

  return {
    word: data.word,
    ipa: data.ipa,
    pronunciationAudioUrl: data.pronunciation_audio_url,
    definitions: data.definitions ?? [],
    translations: data.translations ?? [],
    examples: data.examples ?? [],
    source: 'cache',
  }
}

async function saveToCache(
  result: DictResult,
  sourceLang: string,
  targetLang: string,
): Promise<void> {
  await supabase.from('dictionary_cache').upsert(
    {
      word: result.word.toLowerCase(),
      source_lang: sourceLang,
      target_lang: targetLang,
      ipa: result.ipa,
      pronunciation_audio_url: result.pronunciationAudioUrl,
      definitions: result.definitions,
      translations: result.translations,
      examples: result.examples ?? [],
      source: result.source === 'cache' ? 'gemini' : result.source,
    },
    { onConflict: 'word,source_lang,target_lang' },
  )
}

// ===== Routes =====

export async function dictionaryRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/dictionary/lookup
   * Tek sözcük lookup. Tap-to-translate için ana endpoint.
   */
  fastify.post('/api/dictionary/lookup', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const parsed = LookupWordSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.format() })

    const { word, sourceLang, targetLang, context, bookId, sentenceText, saveToVocab } = parsed.data
    const wordLower = word.toLowerCase()

    // 1. Cache check
    let result = await getCached(wordLower, sourceLang, targetLang)

    // 2. Free Dictionary (only English)
    if (!result && sourceLang === 'en') {
      const free = await fetchFreeDictionary(wordLower, sourceLang)
      if (free && free.definitions?.length) {
        // Türkçe çeviri için yine Gemini'ye git ama IPA ve def'i Free Dict'ten al
        if (targetLang !== 'en') {
          const gemini = await fetchGeminiDictionary(wordLower, sourceLang, targetLang, context)
          result = {
            word: wordLower,
            ipa: free.ipa ?? gemini?.ipa,
            pronunciationAudioUrl: free.pronunciationAudioUrl,
            definitions: free.definitions ?? [],
            translations: gemini?.translations ?? [],
            source: 'free-dict',
          }
        } else {
          result = { ...free, translations: [], source: 'free-dict' } as DictResult
        }
        await saveToCache(result, sourceLang, targetLang)
      }
    }

    // 3. Gemini fallback (her dil için)
    if (!result) {
      const gemini = await fetchGeminiDictionary(wordLower, sourceLang, targetLang, context)
      if (gemini) {
        result = {
          word: wordLower,
          ipa: gemini.ipa,
          definitions: gemini.definitions ?? [],
          translations: gemini.translations ?? [],
          source: 'gemini',
        }
        await saveToCache(result, sourceLang, targetLang)
      }
    }

    if (!result) {
      return reply.code(404).send({ error: 'word_not_found', word })
    }

    // Vocabulary'ye ekle
    if (saveToVocab) {
      await supabase.from('user_vocabulary').upsert(
        {
          user_id: userId,
          word: wordLower,
          language: sourceLang,
          ipa: result.ipa,
          definitions: result.definitions,
          translations: [{ lang: targetLang, translations: result.translations }],
          source_book_id: bookId,
          source_sentence: sentenceText,
          encounters: 1,
          last_seen_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,word,language',
          ignoreDuplicates: false,
        },
      )

      // Encounter sayısını artır
      await supabase.rpc('increment_vocab_encounters', {
        p_user_id: userId,
        p_word: wordLower,
        p_lang: sourceLang,
      })
    }

    return result
  })

  /**
   * POST /api/dictionary/batch-lookup
   * Bir cümledeki tüm bilinmeyen kelimeleri tek seferde çek.
   * Reading session optimizasyonu için.
   */
  fastify.post('/api/dictionary/batch-lookup', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const parsed = BatchLookupSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.format() })

    const { words, sourceLang, targetLang } = parsed.data

    // Önce cache'ten gelen tüm sözcükleri al
    const { data: cached } = await supabase
      .from('dictionary_cache')
      .select('*')
      .in(
        'word',
        words.map((w) => w.toLowerCase()),
      )
      .eq('source_lang', sourceLang)
      .eq('target_lang', targetLang)

    const cachedMap = new Map<string, any>((cached ?? []).map((c: any) => [c.word, c]))
    const missing = words.filter((w) => !cachedMap.has(w.toLowerCase()))

    // Eksikleri Gemini'den paralel çek
    const fetched = await Promise.all(
      missing.map(async (w) => {
        const r = await fetchGeminiDictionary(w.toLowerCase(), sourceLang, targetLang)
        if (r) {
          await saveToCache({ ...r, source: 'gemini' } as DictResult, sourceLang, targetLang)
        }
        return [w, r] as const
      }),
    )

    const fetchedMap = new Map(fetched.filter(([, r]) => r !== null))

    return {
      results: words.map((w) => {
        const wLower = w.toLowerCase()
        const cached = cachedMap.get(wLower)
        if (cached) {
          return {
            word: w,
            ipa: cached.ipa,
            translations: cached.translations,
            definitions: cached.definitions,
            source: 'cache',
          }
        }
        const fresh = fetchedMap.get(w)
        if (fresh) {
          return { word: w, ...fresh, source: 'gemini' }
        }
        return { word: w, error: 'not_found' }
      }),
    }
  })

  /**
   * POST /api/dictionary/translate-sentence
   * Cümle veya paragraf çevir. Bağlam koruyucu.
   */
  fastify.post('/api/dictionary/translate-sentence', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const parsed = TranslateSentenceSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.format() })

    const { text, sourceLang, targetLang, literary } = parsed.data

    // Pro check for literary mode
    if (literary) {
      const { data: ent } = await supabase
        .from('user_entitlements')
        .select('is_pro')
        .eq('user_id', userId)
        .single()
      if (!ent?.is_pro) {
        return reply
          .code(403)
          .send({ error: 'pro_required', message: 'Edebi çeviri Pro üyeler için' })
      }
    }

    // Cache check
    const hash = crypto
      .createHash('sha256')
      .update(`${text}|${sourceLang}|${targetLang}`)
      .digest('hex')
    const { data: cached } = await supabase
      .from('sentence_translation_cache')
      .select('*')
      .eq('source_text_hash', hash)
      .maybeSingle()

    if (cached) {
      await supabase
        .from('sentence_translation_cache')
        .update({ hit_count: cached.hit_count + 1 })
        .eq('id', cached.id)

      return {
        translation: cached.translation,
        alternatives: cached.alternatives,
        notes: cached.notes,
        source: 'cache',
      }
    }

    // Gemini ile çevir
    if (!GEMINI_API_KEY) return reply.code(500).send({ error: 'gemini_not_configured' })

    const langNames: Record<string, string> = {
      en: 'İngilizce',
      tr: 'Türkçe',
      de: 'Almanca',
      fr: 'Fransızca',
      es: 'İspanyolca',
      it: 'İtalyanca',
      ja: 'Japonca',
      ar: 'Arapça',
      ru: 'Rusça',
    }

    const prompt = literary
      ? `Sen edebi bir çevirmensin. Aşağıdaki ${langNames[sourceLang]} metni ${langNames[targetLang]}\'ye çevir. Yazarın üslubunu, ritmini, edebi nüansları koru. Kelimesi kelimesine değil, anlamı ve duyguyu aktarmaya odaklan.

JSON döndür:
{"translation": "çeviri", "alternatives": [{"translation": "alternatif çeviri", "note": "neden farklı"}], "notes": "deyim/kayıt/üslup notu"}

Metin: ${text}`
      : `${langNames[sourceLang]}\'den ${langNames[targetLang]}\'ye doğal bir çeviri yap. Bağlamı ve niyeti koru.

JSON döndür:
{"translation": "çeviri", "alternatives": [{"translation": "alternatif", "note": "kısa açıklama"}], "notes": "varsa deyim/zorluk notu"}

Metin: ${text}`

    try {
      const model = literary ? 'gemini-2.5-pro' : GEMINI_FLASH
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: literary ? 0.7 : 0.3,
              responseMimeType: 'application/json',
            },
          }),
        },
      )

      const data: any = await res.json()
      const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text
      if (!responseText) return reply.code(500).send({ error: 'translation_failed' })

      const parsedResp = JSON.parse(responseText)

      // Cache'e kaydet
      await supabase.from('sentence_translation_cache').insert({
        source_text_hash: hash,
        source_text: text,
        source_lang: sourceLang,
        target_lang: targetLang,
        translation: parsedResp.translation,
        alternatives: parsedResp.alternatives ?? [],
        notes: parsedResp.notes,
        model: literary ? 'gemini-2.5-pro' : 'gemini-flash',
      })

      return {
        translation: parsedResp.translation,
        alternatives: parsedResp.alternatives ?? [],
        notes: parsedResp.notes,
        source: literary ? 'gemini-pro' : 'gemini-flash',
      }
    } catch (err: any) {
      fastify.log.error(err, 'Sentence translation hata')
      return reply.code(500).send({ error: err.message })
    }
  })

  /**
   * GET /api/vocabulary
   * Kullanıcının kişisel kelime dağarcığı. Filtre + sayfalama.
   */
  fastify.get<{ Querystring: { status?: string; lang?: string; bookId?: string; limit?: string } }>(
    '/api/vocabulary',
    async (req, reply) => {
      const userId = await verifyUserToken(req.headers.authorization)
      if (!userId) return reply.code(401).send({ error: 'unauthorized' })

      let query = supabase
        .from('user_vocabulary')
        .select('*')
        .eq('user_id', userId)
        .order('last_seen_at', { ascending: false })
        .limit(Math.min(Number.parseInt(req.query.limit ?? '50'), 200))

      if (req.query.status) query = query.eq('status', req.query.status)
      if (req.query.lang) query = query.eq('language', req.query.lang)
      if (req.query.bookId) query = query.eq('source_book_id', req.query.bookId)

      const { data } = await query
      return { vocabulary: data ?? [] }
    },
  )

  /** PATCH /api/vocabulary/:id */
  fastify.patch<{ Params: { id: string }; Body: { status?: string } }>(
    '/api/vocabulary/:id',
    async (req, reply) => {
      const userId = await verifyUserToken(req.headers.authorization)
      if (!userId) return reply.code(401).send({ error: 'unauthorized' })

      await supabase
        .from('user_vocabulary')
        .update({ status: req.body.status, last_seen_at: new Date().toISOString() })
        .eq('id', req.params.id)
        .eq('user_id', userId)

      return { ok: true }
    },
  )

  /**
   * GET /api/word-frequency/:lang
   * En sık kullanılan kelimeleri döndür ("En İyi 500/1000" Linga özelliği).
   */
  fastify.get<{ Params: { lang: string }; Querystring: { limit?: string; cefr?: string } }>(
    '/api/word-frequency/:lang',
    async (req, reply) => {
      let query = supabase
        .from('word_frequency')
        .select('*')
        .eq('language', req.params.lang)
        .order('rank', { ascending: true })
        .limit(Math.min(Number.parseInt(req.query.limit ?? '500'), 5000))

      if (req.query.cefr) query = query.eq('cefr_level', req.query.cefr)

      const { data } = await query
      return { words: data ?? [] }
    },
  )
}
