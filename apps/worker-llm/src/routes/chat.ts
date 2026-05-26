import { TeachingEngine } from '@kavra/engine'
import { SendMessageSchema } from '@kavra/shared/schemas'
import type { FastifyInstance } from 'fastify'
import { GroqError, groqChat } from '../groq.js'
import { supabase, verifyUserToken } from '../supabase.js'
import { getActiveGroqKey } from './api-keys.js'

const DEFAULT_MODEL = 'llama-3.3-70b-versatile'
const MAX_HISTORY_MESSAGES = 40

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

    // Mesaj sayısını çek (session progression için)
    const { count: msgCount } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('lesson_id', lessonId)

    // ================= TEACHING ENGINE =================
    const engine = new TeachingEngine(supabase, {
      openaiKey: process.env.OPENAI_API_KEY,
    })

    let compiled
    let decision
    try {
      const result = await engine.decide({
        userId,
        lessonId,
        messageContent: content,
        sessionMessageCount: msgCount ?? 0,
        groqApiKey: apiKey,
      })
      compiled = result.prompt
      decision = result.decision
    } catch (err: any) {
      fastify.log.error(err, 'Engine decide failed, falling back to basic prompt')
      // Emniyet fallback: engine tamamen başarısızsa basit prompt
      compiled = {
        systemPrompt: `Sen Kavra'sın. Türkçe konuşan kişisel öğrenme AI'ısın.
Önce anla, sonra anlat. Soru sor. Somut örneklerle açıkla.`,
        temperature: 0.7,
        maxTokens: 2048,
        metadata: { techniqueCode: 'fallback', behaviorCodes: [], hasRAG: false },
      }
      decision = null
    }
    // ===================================================

    // Model seç: request > lesson.model_id > DEFAULT
    let modelName = DEFAULT_MODEL
    const { data: lesson } = await supabase
      .from('lessons')
      .select('model_id, technique_id')
      .eq('id', lessonId)
      .single()

    const resolvedModelId = modelId ?? lesson?.model_id
    if (resolvedModelId) {
      const { data: m } = await supabase
        .from('llm_models')
        .select('model_id')
        .eq('id', resolvedModelId)
        .single()
      if (m?.model_id) modelName = m.model_id
    }

    // Engine seçtiği tekniği lessons.technique_id'ye yaz (UI gösterecek)
    if (decision && lesson?.technique_id !== decision.selectedTechnique.id) {
      await supabase
        .from('lessons')
        .update({ technique_id: decision.selectedTechnique.id })
        .eq('id', lessonId)
    }

    // Geçmiş mesajları yükle
    const { data: history } = await supabase
      .from('messages')
      .select('role, content')
      .eq('lesson_id', lessonId)
      .order('created_at', { ascending: true })
      .limit(MAX_HISTORY_MESSAGES)

    // Kullanıcı mesajını kaydet
    await supabase.from('messages').insert({
      lesson_id: lessonId,
      role: 'user',
      content,
    })

    const messages = [
      { role: 'system' as const, content: compiled.systemPrompt },
      ...(history ?? []).map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user' as const, content },
    ]

    // SSE aç — engine decision da ilk event olarak
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    })

    // Decision'ı meta event olarak gönder (UI gösterebilmesi için)
    if (decision) {
      reply.raw.write(
        `data: ${JSON.stringify({
          meta: {
            context: decision.context,
            intent: decision.intent,
            techniqueCode: decision.selectedTechnique.code,
            techniqueName: decision.selectedTechnique.name,
            activeBehaviors: decision.activeBehaviors,
            hasRAG: decision.ragChunks.length > 0,
            ragSources: decision.ragChunks.map((c) => ({
              doc: c.documentName,
              page: c.pageNumber,
              similarity: c.similarity,
            })),
          },
        })}\n\n`,
      )
    }

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
        temperature: compiled.temperature,
      })

      if (!groqRes.body) throw new Error('Groq yanıt gövdesi alınamadı')

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
            // ignore parse
          }
        }
      }

      // Asistan mesajını kaydet — engine_decision_id ile bağlantılı
      await supabase.from('messages').insert({
        lesson_id: lessonId,
        role: 'assistant',
        content: fullResponse,
        tokens_in: tokensIn,
        tokens_out: tokensOut,
        model_used: modelName,
        latency_ms: Date.now() - startedAt,
        metadata: decision
          ? {
              technique: decision.selectedTechnique.code,
              behaviors: decision.activeBehaviors,
              context: decision.context,
            }
          : null,
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
        err instanceof GroqError ? `Groq: ${err.message}` : (err?.message ?? 'Beklenmeyen hata')

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
