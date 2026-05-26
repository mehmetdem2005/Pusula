import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { modalClonedTTS, validateReferenceAudio } from '../modal-f5tts.js'
import { supabase, verifyUserToken } from '../supabase.js'

const REFERENCE_BUCKET = 'voice-references'

const CreateCloneSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  storagePath: z.string(), // 'voice-references/<user>/<id>.wav'
  durationSeconds: z.number().min(3).max(60),
  referenceText: z.string().min(10).max(500),
  language: z.string().default('tr'),
})

const SynthesizeSchema = z.object({
  cloneId: z.string().uuid(),
  text: z.string().min(1).max(2000),
  speed: z.number().min(0.5).max(2.0).default(1.0),
})

/**
 * Voice cloning routes — sadece Pro kullanıcılar için.
 */
export async function voiceCloneRoutes(fastify: FastifyInstance) {
  // ============ ENTITLEMENT GUARD ============
  // Bu route'lara gelen her request Pro kontrolünden geçer
  async function requirePro(userId: string): Promise<{ ok: boolean; error?: string }> {
    const { data } = await supabase
      .from('user_entitlements')
      .select('is_pro')
      .eq('user_id', userId)
      .single()
    if (!data?.is_pro) {
      return { ok: false, error: 'pro_required' }
    }
    return { ok: true }
  }

  /** GET /api/voice-clones — kullanıcının kayıtlı klonları */
  fastify.get('/api/voice-clones', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const { data } = await supabase
      .from('voice_clones')
      .select(
        'id, name, description, language, status, is_default, use_count, created_at, ready_at',
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    return { clones: data ?? [] }
  })

  /**
   * POST /api/voice-clones/upload-url — referans ses yükleme için signed URL
   * Mobile bu URL'e direkt audio'yu PUT ediyor, sonra create endpoint'ini çağırıyor.
   */
  fastify.post('/api/voice-clones/upload-url', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const proCheck = await requirePro(userId)
    if (!proCheck.ok) return reply.code(403).send({ error: proCheck.error })

    // Bu ay kaç voice clone oluşturmuş kontrol et
    const periodStart = new Date()
    periodStart.setDate(1)
    periodStart.setHours(0, 0, 0, 0)

    const { count } = await supabase
      .from('voice_clones')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', periodStart.toISOString())

    const VOICE_CLONES_PER_MONTH = 10
    if ((count ?? 0) >= VOICE_CLONES_PER_MONTH) {
      return reply.code(429).send({
        error: 'monthly_limit',
        message: `Bu ay ${VOICE_CLONES_PER_MONTH} klon hakkın doldu`,
      })
    }

    // Signed upload URL — 5 dk geçerli
    const cloneId = crypto.randomUUID()
    const path = `${userId}/${cloneId}.wav`

    const { data, error } = await supabase.storage
      .from(REFERENCE_BUCKET)
      .createSignedUploadUrl(path)

    if (error) return reply.code(500).send({ error: error.message })

    return {
      cloneId,
      uploadUrl: data.signedUrl,
      storagePath: path,
      token: data.token,
    }
  })

  /** POST /api/voice-clones — referans yüklendikten sonra klonu oluştur */
  fastify.post('/api/voice-clones', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const proCheck = await requirePro(userId)
    if (!proCheck.ok) return reply.code(403).send({ error: proCheck.error })

    const parsed = CreateCloneSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.format() })

    const { name, description, storagePath, durationSeconds, referenceText, language } = parsed.data

    // Audio'yu indir + validate et
    const { data: audioData, error: dlErr } = await supabase.storage
      .from(REFERENCE_BUCKET)
      .download(storagePath)
    if (dlErr || !audioData) {
      return reply.code(400).send({ error: 'audio_not_uploaded' })
    }

    const audioBuffer = Buffer.from(await audioData.arrayBuffer())
    const validation = await validateReferenceAudio(audioBuffer)
    if (!validation.valid) {
      return reply.code(400).send({
        error: 'invalid_audio',
        details: validation.errors,
      })
    }

    // İlk klon ise default yap
    const { count: existingCount } = await supabase
      .from('voice_clones')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    // Klon kaydı (status='ready' — F5-TTS reference embedding'i synthesize anında yapar)
    const { data: clone, error } = await supabase
      .from('voice_clones')
      .insert({
        user_id: userId,
        name,
        description: description ?? null,
        reference_audio_path: storagePath,
        reference_audio_duration_seconds: durationSeconds,
        reference_text: referenceText,
        language,
        status: 'ready',
        is_default: (existingCount ?? 0) === 0,
        ready_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) return reply.code(500).send({ error: error.message })

    return { clone }
  })

  /**
   * POST /api/voice-clones/:id/synthesize — klonlanmış sesle metin oku
   * Streaming değil — Modal cevabı bekler, mp3 döner.
   */
  fastify.post<{ Params: { id: string } }>(
    '/api/voice-clones/:id/synthesize',
    async (req, reply) => {
      const userId = await verifyUserToken(req.headers.authorization)
      if (!userId) return reply.code(401).send({ error: 'unauthorized' })

      const proCheck = await requirePro(userId)
      if (!proCheck.ok) return reply.code(403).send({ error: proCheck.error })

      const parsed = SynthesizeSchema.safeParse({ ...(req.body as object), cloneId: req.params.id })
      if (!parsed.success) return reply.code(400).send({ error: parsed.error.format() })

      const { data: clone } = await supabase
        .from('voice_clones')
        .select('*')
        .eq('id', req.params.id)
        .eq('user_id', userId)
        .single()
      if (!clone) return reply.code(404).send({ error: 'clone_not_found' })
      if (clone.status !== 'ready') return reply.code(400).send({ error: 'clone_not_ready' })

      // Reference audio için signed URL (Modal indirsin)
      const { data: signed } = await supabase.storage
        .from(REFERENCE_BUCKET)
        .createSignedUrl(clone.reference_audio_path, 600)

      if (!signed?.signedUrl) {
        return reply.code(500).send({ error: 'signed_url_failed' })
      }

      try {
        const result = await modalClonedTTS({
          referenceAudioUrl: signed.signedUrl,
          referenceText: clone.reference_text,
          targetText: parsed.data.text,
          language: clone.language,
          speed: parsed.data.speed,
        })

        // Use count++
        await supabase
          .from('voice_clones')
          .update({
            use_count: (clone.use_count ?? 0) + 1,
            last_used_at: new Date().toISOString(),
          })
          .eq('id', clone.id)

        reply.header('Content-Type', 'audio/mpeg')
        reply.header('Cache-Control', 'public, max-age=86400')
        return reply.send(result.audioBuffer)
      } catch (err: any) {
        fastify.log.error(err, 'Modal F5-TTS hata')
        return reply.code(500).send({ error: 'synthesis_failed', message: err.message })
      }
    },
  )

  /** POST /api/voice-clones/:id/default — varsayılan yap */
  fastify.post<{ Params: { id: string } }>('/api/voice-clones/:id/default', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    // Önce diğerlerini false yap
    await supabase.from('voice_clones').update({ is_default: false }).eq('user_id', userId)

    // Sonra bunu true yap
    const { error } = await supabase
      .from('voice_clones')
      .update({ is_default: true })
      .eq('id', req.params.id)
      .eq('user_id', userId)

    if (error) return reply.code(500).send({ error: error.message })
    return { ok: true }
  })

  /** DELETE /api/voice-clones/:id */
  fastify.delete<{ Params: { id: string } }>('/api/voice-clones/:id', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    // Storage temizle
    const { data: clone } = await supabase
      .from('voice_clones')
      .select('reference_audio_path')
      .eq('id', req.params.id)
      .eq('user_id', userId)
      .single()

    if (clone?.reference_audio_path) {
      await supabase.storage.from(REFERENCE_BUCKET).remove([clone.reference_audio_path])
    }

    await supabase.from('voice_clones').delete().eq('id', req.params.id).eq('user_id', userId)

    return { ok: true }
  })
}
