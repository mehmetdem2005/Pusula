import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
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

    try {
      const result = await synthesizeAndStore(parsed.data, userId)
      return result
    } catch (err: any) {
      fastify.log.error(err, 'TTS sentez hatası')
      return reply.code(500).send({
        error: 'tts_failed',
        detail: err?.message ?? 'Unknown',
        hint: 'Piper kurulu mu? /opt/piper/piper ve models/ kontrol et.',
      })
    }
  })

  // Mevcut sesleri listele
  fastify.get('/api/voice/voices', async () => {
    return {
      voices: [
        { id: 'tr_TR-dfki-medium', language: 'tr', name: 'Türkçe (DFKI Medium)', gender: 'female' },
        {
          id: 'tr_TR-fettah-medium',
          language: 'tr',
          name: 'Türkçe (Fettah Medium)',
          gender: 'male',
        },
        { id: 'en_US-lessac-medium', language: 'en', name: 'English US (Lessac)', gender: 'male' },
        { id: 'en_GB-alan-medium', language: 'en', name: 'English UK (Alan)', gender: 'male' },
        { id: 'de_DE-thorsten-medium', language: 'de', name: 'Deutsch (Thorsten)', gender: 'male' },
        { id: 'es_ES-mls-medium', language: 'es', name: 'Español (MLS)', gender: 'male' },
        { id: 'fr_FR-siwis-medium', language: 'fr', name: 'Français (Siwis)', gender: 'female' },
        { id: 'it_IT-paola-medium', language: 'it', name: 'Italiano (Paola)', gender: 'female' },
        { id: 'pt_BR-faber-medium', language: 'pt', name: 'Português (Faber)', gender: 'male' },
        { id: 'ru_RU-dmitri-medium', language: 'ru', name: 'Русский (Dmitri)', gender: 'male' },
      ],
    }
  })
}
