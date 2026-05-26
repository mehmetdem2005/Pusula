import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { supabase, verifyUserToken } from '../supabase.js'

/**
 * Moderation Routes — AI içerik güvenliği
 * ========================================
 *
 * Strateji:
 *   - OpenAI Moderation API (`omni-moderation-latest`) — text + image, ücretsiz
 *   - Türkçe ve İngilizce için iyi (multilingual model)
 *   - Hem AI üretim öncesi hem üretim sonrası
 *
 * Moderation kategorileri:
 *   sexual, sexual/minors, hate, hate/threatening, harassment,
 *   harassment/threatening, self-harm, self-harm/intent, violence,
 *   violence/graphic, illicit, illicit/violent
 *
 * Eylemler:
 *   clean → izin ver
 *   flagged → kullanıcıya uyarı ver, görseli blur'la
 *   blocked → tamamen reddet
 */

const OPENAI_API_KEY = process.env.OPENAI_API_KEY

const ModerateTextSchema = z.object({
  text: z.string().min(1).max(20_000),
  contentType: z
    .enum(['user_message', 'reflection', 'audio_transcript', 'generated'])
    .default('user_message'),
  sourceTable: z.string().optional(),
  sourceId: z.string().uuid().optional(),
})

const ModerateImageSchema = z.object({
  imageUrl: z.string().url(),
  sourceTable: z.string().optional(),
  sourceId: z.string().uuid().optional(),
})

interface ModerationResult {
  verdict: 'clean' | 'flagged' | 'blocked'
  categories: string[]
  confidence: number
  explanation?: string
}

// Yasak kategoriler (blocked)
const HARD_BLOCK_CATEGORIES = [
  'sexual/minors',
  'self-harm/intent',
  'violence/graphic',
  'hate/threatening',
  'harassment/threatening',
  'illicit/violent',
]

// Uyarı kategorileri (flagged)
const SOFT_FLAG_CATEGORIES = ['sexual', 'self-harm', 'violence', 'hate', 'harassment', 'illicit']

async function moderateWithOpenAI(input: {
  text?: string
  imageUrl?: string
}): Promise<ModerationResult> {
  if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not configured')

  const inputArray: any[] = []
  if (input.text) inputArray.push({ type: 'text', text: input.text })
  if (input.imageUrl) inputArray.push({ type: 'image_url', image_url: { url: input.imageUrl } })

  const res = await fetch('https://api.openai.com/v1/moderations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'omni-moderation-latest',
      input: inputArray,
    }),
  })

  if (!res.ok) throw new Error(`Moderation API: ${res.status} ${await res.text()}`)
  const data: any = await res.json()
  const result = data.results[0]

  // Tüm kategorilerin true/false flag'i + confidence score
  const flaggedCats: string[] = []
  let maxConfidence = 0

  for (const [cat, isFlag] of Object.entries(result.categories) as [string, boolean][]) {
    if (isFlag) {
      flaggedCats.push(cat)
      const score = result.category_scores[cat] as number
      if (score > maxConfidence) maxConfidence = score
    }
  }

  // Verdict
  const hasHardBlock = flaggedCats.some((c) => HARD_BLOCK_CATEGORIES.includes(c))
  const hasSoftFlag = flaggedCats.some((c) => SOFT_FLAG_CATEGORIES.includes(c))

  let verdict: 'clean' | 'flagged' | 'blocked' = 'clean'
  if (hasHardBlock) verdict = 'blocked'
  else if (hasSoftFlag && maxConfidence > 0.7) verdict = 'blocked'
  else if (hasSoftFlag) verdict = 'flagged'

  return {
    verdict,
    categories: flaggedCats,
    confidence: maxConfidence,
  }
}

async function logModeration(args: {
  userId: string | null
  contentType: string
  contentHash?: string
  result: ModerationResult
  action: string
  sourceTable?: string
  sourceId?: string
}) {
  await supabase.from('moderation_log').insert({
    user_id: args.userId,
    content_type: args.contentType,
    content_hash: args.contentHash,
    verdict: args.result.verdict,
    categories: args.result.categories,
    confidence: args.result.confidence,
    action: args.action,
    source_table: args.sourceTable,
    source_id: args.sourceId,
  })
}

export async function moderationRoutes(fastify: FastifyInstance) {
  /** POST /api/moderation/text */
  fastify.post('/api/moderation/text', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const parsed = ModerateTextSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.format() })

    try {
      const result = await moderateWithOpenAI({ text: parsed.data.text })

      const action =
        result.verdict === 'blocked'
          ? 'hide'
          : result.verdict === 'flagged'
            ? 'show_warning'
            : 'show'

      await logModeration({
        userId,
        contentType: parsed.data.contentType,
        result,
        action,
        sourceTable: parsed.data.sourceTable,
        sourceId: parsed.data.sourceId,
      })

      return result
    } catch (e: any) {
      fastify.log.error(e, 'Text moderation hata')
      // Fail-open: hata durumunda izin ver ama log'la
      return { verdict: 'clean', categories: [], confidence: 0, error: e.message }
    }
  })

  /** POST /api/moderation/image */
  fastify.post('/api/moderation/image', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const parsed = ModerateImageSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.format() })

    try {
      const result = await moderateWithOpenAI({ imageUrl: parsed.data.imageUrl })

      const action =
        result.verdict === 'blocked' ? 'hide' : result.verdict === 'flagged' ? 'blur' : 'show'

      await logModeration({
        userId,
        contentType: 'image',
        result,
        action,
        sourceTable: parsed.data.sourceTable,
        sourceId: parsed.data.sourceId,
      })

      return result
    } catch (e: any) {
      fastify.log.error(e, 'Image moderation hata')
      return { verdict: 'clean', categories: [], confidence: 0, error: e.message }
    }
  })

  /** GET /api/moderation/log (admin) */
  fastify.get<{ Querystring: { verdict?: string; limit?: string } }>(
    '/api/moderation/log',
    async (req, reply) => {
      const userId = await verifyUserToken(req.headers.authorization)
      if (!userId) return reply.code(401).send({ error: 'unauthorized' })

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()

      if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
        return reply.code(403).send({ error: 'admin_only' })
      }

      let q = supabase
        .from('moderation_log')
        .select('*, profiles(email, full_name)')
        .order('created_at', { ascending: false })
        .limit(Math.min(Number.parseInt(req.query.limit ?? '50'), 200))

      if (req.query.verdict) q = q.eq('verdict', req.query.verdict)

      const { data } = await q
      return { logs: data ?? [] }
    },
  )
}

// ===== Internal helper (other routes can call) =====

export async function moderateInternal(text: string): Promise<ModerationResult> {
  try {
    return await moderateWithOpenAI({ text })
  } catch {
    return { verdict: 'clean', categories: [], confidence: 0 }
  }
}
