import { SendMessageSchema } from '@kavra/shared/schemas'
import type { FastifyInstance } from 'fastify'
import { GroqError, groqChat } from '../groq.js'
import { supabase, verifyUserToken } from '../supabase.js'
import { getActiveGroqKey } from './api-keys.js'

const DEFAULT_MODEL = 'llama-3.3-70b-versatile'
const MAX_HISTORY_MESSAGES = 40

const BASE_SYSTEM_PROMPT = `Sen Kavra'sın — 150 pedagojik teknikle donanmış, Türkçe konuşan kişisel öğrenme AI'ısın.
Hedefin kullanıcıya sadece bilgi aktarmak değil, o bilgiyi gerçekten kavramasını sağlamaktır.

İlkelerin:
- Önce anla, sonra anlat: Kullanıcının seviyesini ve amacını anla.
- Somutla: Soyut kavramları günlük örneklerle, analojilerle açıkla.
- Soru sor: Öğrencinin bildiklerini aktif hale getir.
- Kısa cümleler, temiz Türkçe. Jargon'u gerektiğinde açıkla.
- Uzun yanıtlarda markdown kullan (başlık, liste, kod bloğu).
- Bir konuyu kavratırken uygun tekniği seç (Feynman, Sokratik, örnekle öğrenme vb.).`

export async function chatRoutes(fastify: FastifyInstance) {
  fastify.post('/api/chat/stream', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const parsed = SendMessageSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.format() })
    const { lessonId, content, modelId } = parsed.data

    const apiKey = await getActiveGroqKey(userId)
    if (!apiKey) {
      return reply.code(400).send({
        error: 'no_active_key',
        message: "Önce Ayarlar > API Anahtarları'ndan Groq anahtarını ekle",
      })
    }

    // Lesson + mevcut mesajlar
    const { data: lesson } = await supabase
      .from('lessons')
      .select('*, personalities(name, system_prompt_fragment, recommended_temperature)')
      .eq('id', lessonId)
      .eq('user_id', userId)
      .single()

    if (!lesson) return reply.code(404).send({ error: 'lesson_not_found' })

    const { data: history } = await supabase
      .from('messages')
      .select('role, content')
      .eq('lesson_id', lessonId)
      .order('created_at', { ascending: true })
      .limit(MAX_HISTORY_MESSAGES)

    // Model seç: request > lesson.model_id > DEFAULT
    let modelName = DEFAULT_MODEL
    const resolvedModelId = modelId ?? (lesson as any).model_id
    if (resolvedModelId) {
      const { data: m } = await supabase
        .from('llm_models')
        .select('model_id')
        .eq('id', resolvedModelId)
        .single()
      if (m?.model_id) modelName = m.model_id
    }

    // System prompt: base + kişilik fragman
    const personality = (lesson as any).personalities
    const personalityFragment = personality?.system_prompt_fragment ?? ''
    const systemPrompt = personalityFragment
      ? `${BASE_SYSTEM_PROMPT}\n\n--- Bu oturumdaki rolün ---\n${personalityFragment}`
      : BASE_SYSTEM_PROMPT

    const temperature = personality?.recommended_temperature ?? 0.7

    // Kullanıcı mesajını kaydet
    await supabase.from('messages').insert({
      lesson_id: lessonId,
      role: 'user',
      content,
    })

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...(history ?? []).map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user' as const, content },
    ]

    // SSE aç
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // nginx buffering devre dışı
    })

    let fullResponse = ''
    let tokensIn = 0
    let tokensOut = 0
    const startedAt = Date.now()

    try {
      const groqRes = await groqChat({
        apiKey,
        model: modelName,
        messages,
        stream: true,
        temperature,
      })

      if (!groqRes.body) throw new Error("Groq'tan yanıt gövdesi alınamadı")

      const reader = groqRes.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed.startsWith('data: ')) continue
          const data = trimmed.slice(6)
          if (data === '[DONE]') continue

          try {
            const json = JSON.parse(data)
            const delta = json.choices?.[0]?.delta?.content
            if (delta) {
              fullResponse += delta
              reply.raw.write(`data: ${JSON.stringify({ delta })}\n\n`)
            }
            if (json.usage) {
              tokensIn = json.usage.prompt_tokens ?? 0
              tokensOut = json.usage.completion_tokens ?? 0
            }
          } catch {
            // ignore parse errors
          }
        }
      }

      // Asistan mesajını kaydet
      await supabase.from('messages').insert({
        lesson_id: lessonId,
        role: 'assistant',
        content: fullResponse,
        tokens_in: tokensIn,
        tokens_out: tokensOut,
        model_used: modelName,
        latency_ms: Date.now() - startedAt,
      })

      await supabase.from('usage_logs').insert({
        user_id: userId,
        lesson_id: lessonId,
        tokens_in: tokensIn,
        tokens_out: tokensOut,
        latency_ms: Date.now() - startedAt,
        success: true,
      })

      reply.raw.write('data: [DONE]\n\n')
      reply.raw.end()
    } catch (err: any) {
      const message =
        err instanceof GroqError
          ? `Groq hatası: ${err.message}`
          : (err?.message ?? 'Beklenmeyen hata')

      reply.raw.write(`data: ${JSON.stringify({ error: message })}\n\n`)
      reply.raw.end()

      await supabase.from('usage_logs').insert({
        user_id: userId,
        lesson_id: lessonId,
        success: false,
        error_message: message,
      })
    }
  })
}
