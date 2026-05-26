import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { supabase, verifyUserToken } from '../supabase.js'

const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN

const GenerateImageSchema = z.object({
  prompt: z.string().min(3).max(1000),
  conversationId: z.string().uuid().optional(),
  model: z.enum(['flux-schnell', 'flux-dev', 'sdxl']).default('flux-schnell'),
  aspectRatio: z.enum(['1:1', '16:9', '9:16', '4:3', '3:4']).default('1:1'),
})

/**
 * AI Image Generation — Pro Feature
 * ===================================
 *
 * Sohbet sırasında AI görsel oluşturur (kavramı anlatmak için).
 *
 * Engine: Replicate (Flux Schnell) — kaliteli, hızlı, ucuz ($0.003/image)
 * Pro user için aylık kotalar var.
 *
 * Free tier: kapalı (Pro feature)
 * Pro tier: ayda 100 görsel
 * Pro lifetime: ayda 200 görsel
 */
export async function aiImagesRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/ai-images/generate
   */
  fastify.post('/api/ai-images/generate', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const parsed = GenerateImageSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.format() })

    // Pro check
    const { data: ent } = await supabase
      .from('user_entitlements')
      .select('is_pro, tier')
      .eq('user_id', userId)
      .single()

    if (!ent?.is_pro) {
      return reply.code(403).send({
        error: 'pro_required',
        message: 'AI görsel üretimi Pro üyeler için',
      })
    }

    // Aylık kota
    const monthLimit = ent.tier === 'pro_lifetime' ? 200 : 100
    const periodStart = new Date()
    periodStart.setDate(1)
    periodStart.setHours(0, 0, 0, 0)
    const periodStartStr = periodStart.toISOString().split('T')[0]

    const { data: quota } = await supabase
      .from('usage_quotas')
      .select('ai_images_generated')
      .eq('user_id', userId)
      .eq('period_start', periodStartStr)
      .maybeSingle()

    const used = quota?.ai_images_generated ?? 0
    if (used >= monthLimit) {
      return reply.code(429).send({
        error: 'monthly_limit',
        used,
        limit: monthLimit,
        message: `Bu ay ${monthLimit} görsel hakkın doldu. Sonraki ay yenilenir.`,
      })
    }

    if (!REPLICATE_TOKEN) {
      return reply.code(500).send({ error: 'replicate_not_configured' })
    }

    // Refine prompt — daha iyi sonuç için Türkçe → İngilizce + style hint
    const refinedPrompt = await refinePrompt(parsed.data.prompt)
    const startedAt = Date.now()

    try {
      // Replicate Flux Schnell
      const modelMap = {
        'flux-schnell': 'black-forest-labs/flux-schnell',
        'flux-dev': 'black-forest-labs/flux-dev',
        sdxl: 'stability-ai/sdxl',
      }

      const createRes = await fetch(
        `https://api.replicate.com/v1/models/${modelMap[parsed.data.model]}/predictions`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${REPLICATE_TOKEN}`,
            'Content-Type': 'application/json',
            Prefer: 'wait',
          },
          body: JSON.stringify({
            input: {
              prompt: refinedPrompt,
              aspect_ratio: parsed.data.aspectRatio,
              output_format: 'webp',
              output_quality: 85,
              num_outputs: 1,
              num_inference_steps: parsed.data.model === 'flux-schnell' ? 4 : 28,
            },
          }),
        },
      )

      if (!createRes.ok) {
        const err = await createRes.text()
        return reply.code(500).send({ error: 'replicate_failed', detail: err })
      }

      const prediction: any = await createRes.json()

      // Sonuç URL'i
      const imageUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output
      if (!imageUrl) {
        return reply.code(500).send({ error: 'no_output' })
      }

      // Kalıcı saklama: Supabase Storage'a kopyala
      const imageRes = await fetch(imageUrl)
      const imageBuffer = Buffer.from(await imageRes.arrayBuffer())

      const fileName = `${userId}/${Date.now()}-${crypto.randomUUID()}.webp`
      const { error: uploadErr } = await supabase.storage
        .from('ai-images')
        .upload(fileName, imageBuffer, { contentType: 'image/webp' })

      if (uploadErr) {
        return reply.code(500).send({ error: 'storage_failed', detail: uploadErr.message })
      }

      const { data: publicUrl } = supabase.storage.from('ai-images').getPublicUrl(fileName)

      const generationTime = Date.now() - startedAt

      // DB kaydı
      const { data: imageRecord } = await supabase
        .from('ai_images')
        .insert({
          user_id: userId,
          conversation_id: parsed.data.conversationId,
          prompt: parsed.data.prompt,
          refined_prompt: refinedPrompt,
          model: parsed.data.model,
          image_url: fileName,
          width: parsed.data.aspectRatio === '1:1' ? 1024 : 1024,
          height: parsed.data.aspectRatio === '1:1' ? 1024 : 768,
          generation_time_ms: generationTime,
        })
        .select()
        .single()

      // Kota update
      await supabase.from('usage_quotas').upsert(
        {
          user_id: userId,
          period_start: periodStartStr,
          ai_images_generated: used + 1,
        },
        { onConflict: 'user_id,period_start' },
      )

      return {
        id: imageRecord?.id,
        imageUrl: publicUrl.publicUrl,
        prompt: parsed.data.prompt,
        refinedPrompt,
        model: parsed.data.model,
        generationTimeMs: generationTime,
        usage: { used: used + 1, limit: monthLimit },
      }
    } catch (err: any) {
      fastify.log.error(err, 'AI image hata')
      return reply.code(500).send({ error: 'generation_failed', message: err.message })
    }
  })

  /** GET /api/ai-images — kullanıcı görselleri */
  fastify.get('/api/ai-images', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const { data } = await supabase
      .from('ai_images')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)

    // Public URL'leri ekle
    const withUrls = (data ?? []).map((img: any) => ({
      ...img,
      publicUrl: supabase.storage.from('ai-images').getPublicUrl(img.image_url).data.publicUrl,
    }))

    return { images: withUrls }
  })

  /** DELETE /api/ai-images/:id */
  fastify.delete<{ Params: { id: string } }>('/api/ai-images/:id', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const { data: img } = await supabase
      .from('ai_images')
      .select('image_url')
      .eq('id', req.params.id)
      .eq('user_id', userId)
      .single()

    if (img?.image_url) {
      await supabase.storage.from('ai-images').remove([img.image_url])
      await supabase.from('ai_images').delete().eq('id', req.params.id).eq('user_id', userId)
    }

    return { ok: true }
  })
}

/**
 * Türkçe prompt'u daha iyi görsel için refine eder.
 * Çok basit kural tabanlı (LLM çağrısı maliyeti olmasın).
 * İleride Groq'a yönlendirip daha akıllı yapılabilir.
 */
async function refinePrompt(originalTr: string): Promise<string> {
  // Quick translation hints — en yaygın Türkçe sözcükleri tutarlılık için ekle
  let refined = originalTr

  // Kavram pedagojik bağlam ekle
  if (!refined.match(/illustration|diagram|infographic|painting|photo/i)) {
    refined +=
      ', educational illustration, clean composition, soft colors, instructional diagram style'
  }

  return refined
}
