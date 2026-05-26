import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { GroqVoiceError, transcribeAudio } from '../groq-stt.js'
import { getActiveGroqKey, supabase, verifyUserToken } from '../supabase.js'

const TranscribeSchema = z.object({
  audioStoragePath: z.string().min(1),
  language: z.string().length(2).optional(),
  lessonId: z.string().uuid().optional(),
})

export async function transcribeRoutes(fastify: FastifyInstance) {
  fastify.post('/api/voice/transcribe', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const parsed = TranscribeSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.format() })
    const { audioStoragePath, language, lessonId } = parsed.data

    const apiKey = await getActiveGroqKey(userId)
    if (!apiKey) return reply.code(400).send({ error: 'no_active_key' })

    // Path güvenlik kontrolü: path kullanıcının klasörüyle başlamalı
    if (!audioStoragePath.startsWith(`${userId}/`)) {
      return reply.code(403).send({ error: 'forbidden_path' })
    }

    // Ses dosyasını Storage'tan indir
    const { data: blob, error: downloadErr } = await supabase.storage
      .from('audio-input')
      .download(audioStoragePath)
    if (downloadErr || !blob) {
      return reply.code(404).send({ error: 'audio_not_found', detail: downloadErr?.message })
    }

    const buffer = Buffer.from(await blob.arrayBuffer())
    const filename = audioStoragePath.split('/').pop() ?? 'audio.m4a'

    try {
      const result = await transcribeAudio(apiKey, buffer, filename, language)

      // Ses kaydını DB'ye logla
      await supabase.from('audio_recordings').insert({
        user_id: userId,
        storage_path: audioStoragePath,
        type: 'user_input',
        duration_seconds: result.duration ?? null,
        language: result.language ?? language ?? null,
        transcription: result.text,
      })

      return {
        text: result.text,
        language: result.language,
        duration: result.duration,
      }
    } catch (err) {
      if (err instanceof GroqVoiceError) {
        return reply.code(err.status).send({ error: 'stt_failed', detail: err.message })
      }
      throw err
    }
  })
}
