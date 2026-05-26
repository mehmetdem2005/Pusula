import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { supabase, verifyUserToken } from '../supabase.js'

/**
 * Handwriting OCR via Gemini Vision
 * ===================================
 *
 * Apple Pencil ile yazılan el yazısı PNG'yi metne çevirir.
 *
 * Türkçe el yazısı için Gemini 2.0 Flash Vision'dan iyi sonuç alıyoruz.
 * Math sembolleri için MathJax LaTeX format'a çevirmesini istiyoruz.
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY

const RecognizeSchema = z.object({
  imageBase64: z.string(),
  mode: z.enum(['text', 'math', 'mixed']).default('text'),
  language: z.string().optional().default('tr'),
})

const PROMPTS = {
  text: `Bu el yazısını oku ve düz metin olarak çıkar. Sadece metni döndür, başka açıklama ekleme.
Yazı Türkçe olabilir veya başka bir dilde — olduğu gibi yaz.
Yazılan dilde tut, çevirme.`,

  math: `Bu el yazısı bir matematiksel ifade veya denklem. LaTeX formatında çıkar.
Sadece LaTeX kodu döndür, $$...$$ delimiter olmadan.
Örnek input: "x^2 + 2x + 1 = 0"
Örnek output: "x^2 + 2x + 1 = 0"`,

  mixed: `Bu el yazısı hem metin hem matematik içerebilir. Markdown formatında döndür.
Matematik kısımları $...$ inline veya $$...$$ block olarak işaretle.
Türkçe veya orijinal dilde tut.`,
}

export async function handwritingRoutes(fastify: FastifyInstance) {
  /** POST /api/handwriting/recognize */
  fastify.post('/api/handwriting/recognize', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const parsed = RecognizeSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.format() })

    if (!GEMINI_API_KEY) {
      return reply.code(500).send({ error: 'gemini_not_configured' })
    }

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: PROMPTS[parsed.data.mode] },
                  {
                    inline_data: {
                      mime_type: 'image/png',
                      data: parsed.data.imageBase64,
                    },
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 2048,
            },
          }),
        },
      )

      if (!res.ok) throw new Error(`Gemini: ${res.status}`)
      const data: any = await res.json()
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

      return {
        text: text.trim(),
        mode: parsed.data.mode,
      }
    } catch (e: any) {
      fastify.log.error(e, 'Handwriting OCR hata')
      return reply.code(500).send({ error: 'ocr_failed', message: e.message })
    }
  })
}
