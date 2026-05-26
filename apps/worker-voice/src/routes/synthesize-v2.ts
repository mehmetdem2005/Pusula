import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { defaultVoiceForLanguage, edgeTTS } from '../edge-tts.js'
import { elevenLabsTTS } from '../elevenlabs.js'
import { synthesizeAndStore } from '../piper.js'
import { supabase, verifyUserToken } from '../supabase.js'

const SynthesizeV2Schema = z.object({
  text: z.string().min(1).max(5000),
  engine: z.enum(['edge', 'piper', 'elevenlabs', 'clone']).default('edge'),
  voice: z.string().optional(),
  language: z.string().length(2).default('tr'),
  gender: z.enum(['Male', 'Female']).optional(),
  speed: z.number().min(0.5).max(2.0).default(1.0),
  stream: z.boolean().default(false),
})

/**
 * TTS Synthesize V2
 * =================
 *
 * Engine seçimi:
 *   - edge:       Microsoft Edge TTS (free tier, ücretsiz, kaliteli neural)
 *   - piper:      Piper local TTS (offline, bellek dostu, kalitesi orta)
 *   - elevenlabs: ElevenLabs (Pro, en doğal, ücretli)
 *   - clone:      F5-TTS Voice Cloning (Pro, kullanıcının kendi sesi)
 *
 * Default: edge — kaliteli + ücretsiz
 */
export async function synthesizeV2Routes(fastify: FastifyInstance) {
  fastify.post('/api/voice/synthesize/v2', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const parsed = SynthesizeV2Schema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.format() })

    const { text, engine, voice, language, gender, speed } = parsed.data

    // Pro engine'leri için entitlement kontrolü
    if (engine === 'elevenlabs' || engine === 'clone') {
      const { data: ent } = await supabase
        .from('user_entitlements')
        .select('is_pro')
        .eq('user_id', userId)
        .single()

      if (!ent?.is_pro) {
        return reply.code(403).send({
          error: 'pro_required',
          message: `${engine} sadece Pro kullanıcılar için. Pro\'ya geç ya da Edge TTS kullan.`,
        })
      }
    }

    try {
      let audioBuffer: Buffer
      const contentType = 'audio/mpeg'

      switch (engine) {
        case 'edge': {
          // Hız: speed 1.0 → 0%, 0.5 → -50%, 2.0 → +100%
          const ratePercent = Math.round((speed - 1.0) * 100)
          const selectedVoice = voice ?? defaultVoiceForLanguage(language, gender)

          audioBuffer = await edgeTTS({
            text,
            voice: selectedVoice,
            rate: ratePercent,
          })
          break
        }

        case 'elevenlabs': {
          audioBuffer = await elevenLabsTTS({
            text,
            voiceId: voice,
            modelId: 'eleven_multilingual_v2',
          })
          break
        }

        case 'piper': {
          // Piper uses storage, route returns URL
          const result = await synthesizeAndStore({ text, language, voice, speed }, userId)
          return result
        }

        case 'clone': {
          return reply.code(400).send({
            error: 'use_clone_endpoint',
            message: 'Voice cloning için /api/voice-clones/:id/synthesize kullan',
          })
        }
      }

      reply.header('Content-Type', contentType)
      reply.header('Cache-Control', 'public, max-age=3600')
      reply.header('X-TTS-Engine', engine)
      return reply.send(audioBuffer)
    } catch (err: any) {
      fastify.log.error(err, `TTS synthesize hata (${engine})`)
      return reply.code(500).send({
        error: 'tts_failed',
        engine,
        message: err.message,
      })
    }
  })

  /** GET /api/voice/voices/v2 — engine\'lere göre tüm sesler */
  fastify.get('/api/voice/voices/v2', async () => {
    const { TURKISH_VOICES, ENGLISH_VOICES } = await import('../edge-tts.js')
    const { ELEVENLABS_VOICES } = await import('../elevenlabs.js')

    return {
      edge: {
        free: true,
        voices: [
          ...TURKISH_VOICES.map((v) => ({
            id: v.shortName,
            name: v.displayName,
            gender: v.gender,
            language: v.locale,
            description: 'Microsoft Edge Neural TTS · Ücretsiz',
          })),
          ...ENGLISH_VOICES.map((v) => ({
            id: v.shortName,
            name: v.displayName,
            gender: v.gender,
            language: v.locale,
            description: 'Microsoft Edge Neural TTS · Ücretsiz',
          })),
        ],
      },
      piper: {
        free: true,
        voices: [
          { id: 'tr_TR-dfki-medium', name: 'DFKI', gender: 'Female', language: 'tr-TR' },
          { id: 'tr_TR-fettah-medium', name: 'Fettah', gender: 'Male', language: 'tr-TR' },
        ],
      },
      elevenlabs: {
        free: false,
        proRequired: true,
        voices: ELEVENLABS_VOICES.map((v) => ({
          id: v.voiceId,
          name: v.name,
          gender: 'Multilingual',
          language: v.language,
          description: v.description + ' · Pro',
        })),
      },
    }
  })
}
