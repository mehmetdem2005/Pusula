import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { supabase, verifyUserToken } from '../supabase.js'

/**
 * Notebook Chat Routes — RAG-grounded Q&A with citations
 * =======================================================
 *
 * Akış:
 *   1. Kullanıcı sorusu gelir
 *   2. Soruyu embed et
 *   3. Hybrid search (vector + BM25) → top 8 chunk
 *   4. LLM'e sistem prompt + chunks + soru
 *   5. LLM cevabı `[[1]]`, `[[2]]` markerla üretir
 *   6. Citation map + cevap döndür
 */

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const GROQ_API_KEY = process.env.GROQ_API_KEY
const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY

const ChatSchema = z.object({
  notebookId: z.string().uuid(),
  message: z.string().min(1).max(4000),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      }),
    )
    .max(20)
    .default([]),
  sourceFilter: z.array(z.string().uuid()).optional(), // belirli kaynaklarla sınırla
})

interface RetrievedChunk {
  id: string
  source_id: string
  text: string
  page_number: number | null
  section_title: string | null
  start_time_ms: number | null
  end_time_ms: number | null
  combined_rank: number
}

async function embedQuery(text: string): Promise<number[]> {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text,
      dimensions: 1536,
    }),
  })

  if (!res.ok) throw new Error(`Embedding: ${res.status}`)
  const data: any = await res.json()
  return data.data[0].embedding
}

async function callGemini(
  systemPrompt: string,
  messages: Array<{ role: string; content: string }>,
) {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY missing')

  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: { temperature: 0.3, maxOutputTokens: 2048 },
      }),
    },
  )

  if (!res.ok) throw new Error(`Gemini: ${res.status} ${await res.text()}`)
  const data: any = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  const usage = data.usageMetadata ?? {}
  return {
    text,
    tokensInput: usage.promptTokenCount ?? 0,
    tokensOutput: usage.candidatesTokenCount ?? 0,
  }
}

async function callGroq(systemPrompt: string, messages: Array<{ role: string; content: string }>) {
  if (!GROQ_API_KEY) throw new Error('GROQ_API_KEY missing')

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      temperature: 0.3,
      max_tokens: 2048,
    }),
  })

  if (!res.ok) throw new Error(`Groq: ${res.status} ${await res.text()}`)
  const data: any = await res.json()

  return {
    text: data.choices?.[0]?.message?.content ?? '',
    tokensInput: data.usage?.prompt_tokens ?? 0,
    tokensOutput: data.usage?.completion_tokens ?? 0,
  }
}

/**
 * Anthropic Claude with native Citations API
 * ============================================
 *
 * Pro+ users için: Claude Sonnet 4.6 + documents parameter + citations: { enabled: true }
 *
 * Avantajlar:
 *   - Regex parsing yerine API'nin döndürdüğü gerçek alıntılar
 *   - Karakter-seviyesi precision (hangi kelimelere referans verdiği belli)
 *   - Hallucination'a daha dirençli (model kaynak göstermesi zorunlu)
 *
 * Maliyet: Sonnet 4.6 $3/$15 per Mtok — Gemini Flash'tan ~6x pahalı
 * Bu yüzden Pro+ tier (lifetime) için default
 */
async function callAnthropicWithCitations(
  systemPrompt: string,
  userQuery: string,
  chunks: RetrievedChunk[],
): Promise<{ text: string; tokensInput: number; tokensOutput: number; nativeCitations: any[] }> {
  if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY missing')

  // Documents API parameter
  const documents = chunks.map((c, i) => ({
    type: 'document' as const,
    source: {
      type: 'text' as const,
      media_type: 'text/plain' as const,
      data: c.text,
    },
    title: `Pasaj ${i + 1}`,
    citations: { enabled: true },
  }))

  // System mesajı (basit talimat — kaynak listesi documents'ta)
  const cleanSystem = `Sen Kavra'sın — kullanıcının kaynaklarına dayanan öğretici asistan.

Sadece sana verilen documents'tan yanıt ver. Hayal kurma.
Kısa ve net ol (3-5 cümle).
Türkçe ve doğal cevap ver.`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6-20250929',
      max_tokens: 2048,
      system: cleanSystem,
      messages: [
        {
          role: 'user',
          content: [...documents, { type: 'text', text: userQuery }],
        },
      ],
    }),
  })

  if (!res.ok) throw new Error(`Anthropic: ${res.status} ${await res.text()}`)
  const data: any = await res.json()

  // Content blocks: text + tool_use mixed
  const textParts: string[] = []
  const nativeCitations: any[] = []

  for (const block of data.content ?? []) {
    if (block.type === 'text') {
      textParts.push(block.text)

      // Citations array — her text block'a bağlı
      if (Array.isArray(block.citations)) {
        for (const cit of block.citations) {
          // cit.document_index → chunks[index]
          const chunk = chunks[cit.document_index]
          if (chunk) {
            nativeCitations.push({
              chunkIndex: cit.document_index,
              chunk_id: chunk.id,
              source_id: chunk.source_id,
              cited_text: cit.cited_text,
              start_char: cit.start_char_index,
              end_char: cit.end_char_index,
            })
          }
        }
      }
    }
  }

  return {
    text: textParts.join(''),
    tokensInput: data.usage?.input_tokens ?? 0,
    tokensOutput: data.usage?.output_tokens ?? 0,
    nativeCitations,
  }
}

function buildSystemPrompt(chunks: RetrievedChunk[], notebookLanguage: string): string {
  const sourcesBlock = chunks
    .map((c, i) => {
      let location = ''
      if (c.page_number) location = ` (Sayfa ${c.page_number})`
      else if (c.start_time_ms != null) {
        const sec = Math.floor(c.start_time_ms / 1000)
        const mm = Math.floor(sec / 60)
        const ss = sec % 60
        location = ` (${mm.toString().padStart(2, '0')}:${ss.toString().padStart(2, '0')})`
      }
      return `[[${i + 1}]]${location}: ${c.text}`
    })
    .join('\n\n---\n\n')

  const langInstr =
    notebookLanguage === 'tr'
      ? 'TÜRKÇE cevap ver, doğal ve sıcak bir dille.'
      : `Cevabı ${notebookLanguage} dilinde yaz.`

  return `Sen Kavra'sın — kullanıcının kaynaklarına dayanarak soru yanıtlayan bir öğretici asistan.

KURALLAR:
1. SADECE aşağıdaki KAYNAK BLOKLARINI kullan. Dışarıdan bilgi ekleme.
2. Her iddianın yanına \`[[n]]\` formatında alıntı koy. Örn: "Mitokondri hücrenin enerji üreten organelidir [[1]]."
3. Birden fazla kaynak destekliyorsa: \`[[1]][[3]]\` şeklinde sırala.
4. Eğer kaynaklarda cevap yoksa, "Verdiğin kaynaklarda bu konuda bilgi yok :/" de.
5. Hayalden bilgi üretme — kaynaklarla sınırlı kal.
6. ${langInstr}
7. Kısa ve net ol. 3-5 cümleyi geçme (kullanıcı uzun isterse "daha detaylı" der).

KAYNAK BLOKLARI:

${sourcesBlock}`
}

function extractCitations(
  text: string,
  chunks: RetrievedChunk[],
  sourceMap: Map<string, { id: string; title: string }>,
): Array<{ chunk_id: string; source_id: string; source_title: string; snippet: string }> {
  const citations: Array<any> = []
  const matches = text.matchAll(/\[\[(\d+)\]\]/g)
  const seen = new Set<number>()

  for (const m of matches) {
    const n = Number.parseInt(m[1] ?? '0')
    if (seen.has(n)) continue
    seen.add(n)
    const chunk = chunks[n - 1]
    if (!chunk) continue

    const source = sourceMap.get(chunk.source_id)
    citations.push({
      chunk_id: chunk.id,
      source_id: chunk.source_id,
      source_title: source?.title ?? 'Bilinmeyen kaynak',
      snippet: chunk.text.slice(0, 200) + (chunk.text.length > 200 ? '...' : ''),
      page_number: chunk.page_number,
      start_time_ms: chunk.start_time_ms,
      end_time_ms: chunk.end_time_ms,
    })
  }

  return citations
}

export async function notebookChatRoutes(fastify: FastifyInstance) {
  /** POST /api/notebooks/:id/chat */
  fastify.post<{ Params: { id: string } }>('/api/notebooks/:id/chat', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const parsed = ChatSchema.safeParse({ ...(req.body as object), notebookId: req.params.id })
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.format() })

    const { notebookId, message, history } = parsed.data

    // Notebook ownership + language
    const { data: notebook } = await supabase
      .from('notebooks')
      .select('language')
      .eq('id', notebookId)
      .eq('user_id', userId)
      .single()

    if (!notebook) return reply.code(404).send({ error: 'notebook_not_found' })

    // 1. Embed query
    const queryEmbed = await embedQuery(message)

    // 2. Hybrid search
    const { data: rawChunks, error: searchErr } = await supabase.rpc('search_chunks_hybrid', {
      p_notebook_id: notebookId,
      p_user_id: userId,
      p_query_embedding: queryEmbed as any,
      p_query_text: message,
      p_match_count: 8,
      p_full_text_weight: 0.3,
      p_semantic_weight: 0.7,
    })

    if (searchErr) {
      fastify.log.error(searchErr, 'Hybrid search hata')
      return reply.code(500).send({ error: 'search_failed' })
    }

    const chunks = (rawChunks ?? []) as RetrievedChunk[]

    if (chunks.length === 0) {
      // Hiç chunk yok — kullanıcıya kaynak yüklemesini söyle
      const noSourcesMsg =
        'Bu defterde henüz işlenmiş kaynak yok :/ Önce bir PDF, URL veya metin ekle.'
      await supabase.from('notebook_messages').insert([
        { notebook_id: notebookId, user_id: userId, role: 'user', content: message },
        { notebook_id: notebookId, user_id: userId, role: 'assistant', content: noSourcesMsg },
      ])
      return { content: noSourcesMsg, citations: [], tokensInput: 0, tokensOutput: 0 }
    }

    // 3. Source titles for citations
    const sourceIds = [...new Set(chunks.map((c) => c.source_id))]
    const { data: sources } = await supabase
      .from('notebook_sources')
      .select('id, title')
      .in('id', sourceIds)

    const sourceMap = new Map((sources ?? []).map((s: any) => [s.id, { id: s.id, title: s.title }]))

    // 4. Build prompt + call LLM
    const systemPrompt = buildSystemPrompt(chunks, notebook.language ?? 'tr')

    const llmMessages = [
      ...history.slice(-6), // last 6 turns
      { role: 'user', content: message },
    ]

    let result: {
      text: string
      tokensInput: number
      tokensOutput: number
      model: string
      nativeCitations?: any[]
    }

    // Pro+ check (lifetime users → Anthropic Citations API)
    const { data: ent } = await supabase
      .from('user_entitlements')
      .select('is_pro, metadata')
      .eq('user_id', userId)
      .single()
    const isLifetime = ent?.metadata?.product_id?.includes('lifetime') ?? false
    const useAnthropic = isLifetime && ANTHROPIC_API_KEY

    try {
      if (useAnthropic) {
        // Pro+ — gerçek API citations
        const r = await callAnthropicWithCitations(systemPrompt, message, chunks)
        result = { ...r, model: 'claude-sonnet-4-6' }
      } else if (GEMINI_API_KEY) {
        const r = await callGemini(systemPrompt, llmMessages)
        result = { ...r, model: 'gemini-2.0-flash' }
      } else if (GROQ_API_KEY) {
        const r = await callGroq(systemPrompt, llmMessages)
        result = { ...r, model: 'llama-3.3-70b' }
      } else {
        return reply.code(500).send({ error: 'no_llm_configured' })
      }
    } catch (err: any) {
      fastify.log.error(err, 'LLM hata')
      // Anthropic fail olursa Gemini'ye düş
      if (useAnthropic && GEMINI_API_KEY) {
        fastify.log.warn('Anthropic fallback to Gemini')
        const r = await callGemini(systemPrompt, llmMessages)
        result = { ...r, model: 'gemini-2.0-flash' }
      } else {
        return reply.code(500).send({ error: 'llm_failed', message: err.message })
      }
    }

    // 5. Extract citations
    let citations: any[]
    if (result.nativeCitations && result.nativeCitations.length > 0) {
      // Anthropic native citations — chunk-level mapping
      const seen = new Set<number>()
      citations = []
      for (const cit of result.nativeCitations) {
        if (seen.has(cit.chunkIndex)) continue
        seen.add(cit.chunkIndex)
        const chunk = chunks[cit.chunkIndex]
        if (!chunk) continue
        const source = sourceMap.get(chunk.source_id)
        citations.push({
          chunk_id: chunk.id,
          source_id: chunk.source_id,
          source_title: source?.title ?? 'Bilinmeyen',
          snippet: cit.cited_text || chunk.text.slice(0, 200),
          page_number: chunk.page_number,
          start_time_ms: chunk.start_time_ms,
          end_time_ms: chunk.end_time_ms,
          native: true,
        })
      }
    } else {
      citations = extractCitations(result.text, chunks, sourceMap)
    }

    // 6. Save messages
    await supabase.from('notebook_messages').insert([
      {
        notebook_id: notebookId,
        user_id: userId,
        role: 'user',
        content: message,
      },
      {
        notebook_id: notebookId,
        user_id: userId,
        role: 'assistant',
        content: result.text,
        citations,
        model: result.model,
        tokens_input: result.tokensInput,
        tokens_output: result.tokensOutput,
      },
    ])

    // 7. Recount
    await supabase.rpc('recount_notebook_aggregates', { p_notebook_id: notebookId })

    return {
      content: result.text,
      citations,
      model: result.model,
      tokensInput: result.tokensInput,
      tokensOutput: result.tokensOutput,
    }
  })

  /** GET /api/notebooks/:id/messages */
  fastify.get<{ Params: { id: string }; Querystring: { limit?: string } }>(
    '/api/notebooks/:id/messages',
    async (req, reply) => {
      const userId = await verifyUserToken(req.headers.authorization)
      if (!userId) return reply.code(401).send({ error: 'unauthorized' })

      const limit = Math.min(Number.parseInt(req.query.limit ?? '50'), 200)

      const { data } = await supabase
        .from('notebook_messages')
        .select('*')
        .eq('notebook_id', req.params.id)
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
        .limit(limit)

      return { messages: data ?? [] }
    },
  )

  /** DELETE /api/notebooks/:id/messages — clear history */
  fastify.delete<{ Params: { id: string } }>('/api/notebooks/:id/messages', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    await supabase
      .from('notebook_messages')
      .delete()
      .eq('notebook_id', req.params.id)
      .eq('user_id', userId)

    return { ok: true }
  })
}
