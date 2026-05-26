import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { edgeTTS } from '../edge-tts.js'
import { ELEVENLABS_VOICES, elevenlabsSingle } from '../lib/elevenlabs.js'
import { supabase, verifyUserToken } from '../supabase.js'

/**
 * Podcast Synthesis Routes
 * ========================
 *
 * Audio overview script'i (turns array) verildikten sonra:
 *   1. Her turn için TTS üret (Edge TTS, A=Emel, B=Ahmet)
 *   2. Audio segmentleri concat et (FFmpeg yerine basit byte-level concat)
 *   3. notebook-outputs bucket'ına yükle
 *   4. generated_content.storage_path güncelle
 *
 * NOT: Production'da gerçek mp3 birleştirme için ffmpeg/lavfi gerekir.
 * Burada her turn ayrı mp3 dosyası kalıyor, frontend sırayla oynatır
 * (segment list ile). Bu yaklaşım: kolay implement + iyi UX (skip kontrolü).
 *
 * İleride: Modal/Replicate'e ffmpeg worker yazıp tek mp3 üret.
 */

const SynthesizePodcastSchema = z.object({
  generatedContentId: z.string().uuid(),
})

const VOICE_MAP: Record<string, Record<string, string>> = {
  tr: {
    A: 'tr-TR-EmelNeural', // Kadın
    B: 'tr-TR-AhmetNeural', // Erkek
  },
  en: {
    A: 'en-US-AriaNeural',
    B: 'en-US-GuyNeural',
  },
  de: {
    A: 'de-DE-KatjaNeural',
    B: 'de-DE-ConradNeural',
  },
  fr: {
    A: 'fr-FR-DeniseNeural',
    B: 'fr-FR-HenriNeural',
  },
  es: {
    A: 'es-ES-ElviraNeural',
    B: 'es-ES-AlvaroNeural',
  },
  ja: {
    A: 'ja-JP-NanamiNeural',
    B: 'ja-JP-KeitaNeural',
  },
}

export async function podcastSynthesisRoutes(fastify: FastifyInstance) {
  /** POST /api/podcast/synthesize */
  fastify.post('/api/podcast/synthesize', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const parsed = SynthesizePodcastSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.format() })

    // Generated content + script
    const { data: gen } = await supabase
      .from('generated_content')
      .select('*, podcast_scripts(*)')
      .eq('id', parsed.data.generatedContentId)
      .eq('user_id', userId)
      .single()

    if (!gen) return reply.code(404).send({ error: 'not_found' })
    if (gen.content_type !== 'audio_overview') {
      return reply.code(400).send({ error: 'not_audio_overview' })
    }
    if (gen.status !== 'ready') {
      return reply.code(400).send({ error: 'script_not_ready', status: gen.status })
    }
    if (gen.storage_path) {
      // Already synthesized
      const { data: urlData } = await supabase.storage
        .from('notebook-outputs')
        .createSignedUrl(gen.storage_path, 3600)
      return { audioUrl: urlData?.signedUrl, storagePath: gen.storage_path }
    }

    const script = (gen as any).podcast_scripts?.[0]
    if (!script) return reply.code(400).send({ error: 'no_script' })

    const turns = script.turns as Array<{ speaker: 'A' | 'B'; text: string }>
    const language = (script.language ?? 'tr') as keyof typeof VOICE_MAP
    const voices = VOICE_MAP[language] ?? VOICE_MAP.tr!

    // Voice provider seçimi: Pro+ (lifetime) ElevenLabs alır, normal Pro Edge TTS
    const { data: ent } = await supabase
      .from('user_entitlements')
      .select('is_pro, source, metadata')
      .eq('user_id', userId)
      .single()

    const isPro = ent?.is_pro ?? false
    const isLifetime = ent?.metadata?.product_id?.includes('lifetime') ?? false
    const useElevenLabs = isLifetime || (parsed.data as any).voiceProvider === 'elevenlabs'
    const voiceProvider: 'edge' | 'elevenlabs' =
      useElevenLabs && process.env.ELEVENLABS_API_KEY ? 'elevenlabs' : 'edge'

    fastify.log.info({ userId, voiceProvider, isLifetime, turns: turns.length }, 'Podcast synth')

    // Background synthesize
    setImmediate(async () => {
      try {
        // Mark synthesizing
        await supabase.from('generated_content').update({ status: 'processing' }).eq('id', gen.id)

        const segments: {
          offset: number
          durationMs: number
          speaker: 'A' | 'B'
          text: string
          storagePath: string
        }[] = []
        let totalOffset = 0

        for (let i = 0; i < turns.length; i++) {
          const turn = turns[i]!
          const voice = voices[turn.speaker]

          // Voice synthesis (provider switch)
          let audio: Buffer
          let durationMs: number

          if (voiceProvider === 'elevenlabs') {
            const elVoice = (ELEVENLABS_VOICES[language] ?? ELEVENLABS_VOICES.en!)[turn.speaker]
            audio = await elevenlabsSingle(turn.text, elVoice)
            durationMs = Math.round((audio.length / 16000) * 1000) // 128kbps mp3
          } else {
            audio = await edgeTTS({ text: turn.text, voice })
            durationMs = Math.round((audio.length / 6000) * 1000) // 48kbps mp3
          }

          // Upload segment
          const segPath = `${userId}/podcasts/${gen.id}/turn-${i.toString().padStart(3, '0')}.mp3`
          await supabase.storage.from('notebook-outputs').upload(segPath, audio, {
            contentType: 'audio/mpeg',
            upsert: true,
          })

          segments.push({
            offset: totalOffset,
            durationMs,
            speaker: turn.speaker,
            text: turn.text,
            storagePath: segPath,
          })

          totalOffset += durationMs + 200 // 200ms inter-turn pause
        }

        // Manifest dosyası — frontend sırayla oynatır
        const manifestPath = `${userId}/podcasts/${gen.id}/manifest.json`
        const manifest = {
          totalDurationMs: totalOffset,
          totalTurns: turns.length,
          language,
          voices,
          voiceProvider,
          segments: segments.map((s) => ({
            offset: s.offset,
            durationMs: s.durationMs,
            speaker: s.speaker,
            text: s.text,
            storagePath: s.storagePath,
          })),
        }

        await supabase.storage
          .from('notebook-outputs')
          .upload(manifestPath, Buffer.from(JSON.stringify(manifest)), {
            contentType: 'application/json',
            upsert: true,
          })

        // Generated content'i güncelle
        await supabase
          .from('generated_content')
          .update({
            status: 'ready',
            storage_path: manifestPath,
            duration_seconds: Math.round(totalOffset / 1000),
            ready_at: new Date().toISOString(),
          })
          .eq('id', gen.id)
      } catch (err: any) {
        await supabase
          .from('generated_content')
          .update({
            status: 'failed',
            error_message: `Synthesize: ${err.message}`,
          })
          .eq('id', gen.id)
        fastify.log.error(err, 'Podcast synth hata')
      }
    })

    return { ok: true, status: 'queued' }
  })

  /** GET /api/podcast/:id/manifest — frontend için */
  fastify.get<{ Params: { id: string } }>('/api/podcast/:id/manifest', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const { data: gen } = await supabase
      .from('generated_content')
      .select('storage_path, status')
      .eq('id', req.params.id)
      .eq('user_id', userId)
      .single()

    if (!gen) return reply.code(404).send({ error: 'not_found' })
    if (gen.status !== 'ready' || !gen.storage_path) {
      return reply.code(400).send({ error: 'not_ready', status: gen.status })
    }

    // Manifest indir
    const { data: blob } = await supabase.storage
      .from('notebook-outputs')
      .download(gen.storage_path)
    if (!blob) return reply.code(404).send({ error: 'manifest_not_found' })

    const manifest = JSON.parse(await blob.text())

    // Her segment için signed URL üret
    const segmentsWithUrls = await Promise.all(
      manifest.segments.map(async (s: any) => {
        const { data: urlData } = await supabase.storage
          .from('notebook-outputs')
          .createSignedUrl(s.storagePath, 7200)
        return { ...s, audioUrl: urlData?.signedUrl }
      }),
    )

    return { ...manifest, segments: segmentsWithUrls }
  })
}
