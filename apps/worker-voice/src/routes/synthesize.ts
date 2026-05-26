import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { ENGLISH_VOICES, TURKISH_VOICES, synthesizeEdgeAndStore } from '../edge-tts.js'
import { synthesizeAndStore } from '../piper.js'
import { verifyUserToken } from '../supabase.js'

const SynthesizeSchema = z.object({
  text: z.string().min(1).max(5000),
  language: z.string().length(2).default('tr'),
  voice: z.string().optional(),
  speed: z.number().min(0.5).max(2.0).default(1.0),
})

export async function synthesizeRoutes(fastify: FastifyInstance) {
  fastify.post('/api/voice/synthesize', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const parsed = SynthesizeSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.format() })

    // Önce Edge TTS (ücretsiz, kaliteli neural). Başarısız olursa Piper'a düş.
    try {
      const result = await synthesizeEdgeAndStore(parsed.data)
      return result
    } catch (edgeErr: any) {
      fastify.log.warn(edgeErr, 'Edge TTS başarısız, Piper fallback')
      try {
        const result = await synthesizeAndStore(parsed.data, userId)
        return result
      } catch (err: any) {
        fastify.log.error(err, 'TTS sentez hatası (edge + piper)')
        return reply.code(500).send({
          error: 'tts_failed',
          detail: err?.message ?? edgeErr?.message ?? 'Unknown',
        })
      }
    }
  })

  // Mevcut sesleri listele — Edge TTS neural sesler (ücretsiz)
  fastify.get('/api/voice/voices', async () => {
    return {
      voices: [...TURKISH_VOICES, ...ENGLISH_VOICES].map((v) => ({
        id: v.shortName,
        language: v.locale.split('-')[0],
        name: v.displayName,
        gender: v.gender.toLowerCase(),
      })),
    }
  })
}
