import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { GEMINI_VOICES, isGeminiTTSConfigured, synthesizeGeminiAndStore } from '../gemini-tts.js'
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

    // Önce Gemini TTS (ücretsiz tier, kaliteli neural, çok dilli). Olmazsa Piper.
    let geminiErr: any = null
    if (isGeminiTTSConfigured()) {
      try {
        return await synthesizeGeminiAndStore(parsed.data)
      } catch (err: any) {
        geminiErr = err
        fastify.log.warn(err, 'Gemini TTS başarısız, Piper fallback')
      }
    }
    try {
      return await synthesizeAndStore(parsed.data, userId)
    } catch (err: any) {
      fastify.log.error(err, 'TTS sentez hatası (gemini + piper)')
      return reply.code(500).send({
        error: 'tts_failed',
        detail: err?.message ?? geminiErr?.message ?? 'Unknown',
      })
    }
  })

  // Mevcut sesleri listele — Gemini neural sesler (ücretsiz tier)
  fastify.get('/api/voice/voices', async () => {
    return {
      voices: GEMINI_VOICES.map((v) => ({
        id: v.id,
        language: 'tr',
        name: v.name,
        gender: v.gender.toLowerCase(),
      })),
    }
  })
}
