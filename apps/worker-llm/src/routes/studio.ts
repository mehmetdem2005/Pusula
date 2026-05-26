import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { supabase, verifyUserToken } from '../supabase.js'

/**
 * Studio Routes — NotebookLM "Studio" özelikleri
 * ===============================================
 *
 * 1. Audio Overview (Sesli Özet) — Gemini 2.0 Flash + Edge multi-voice
 * 2. Auto Flashcards — LLM-generated SRS cards
 * 3. Auto Quiz — MCQ + short answer
 * 4. Slides — JSON structure → carousel
 * 5. Summary — düz metin özet
 * 6. Infographic — Mermaid markdown
 *
 * Sesli Özet ideal: Gemini 3.1 Flash multi-speaker `tr-TR` (henüz preview).
 * Bu yüzden geçici olarak: script üretimi Gemini 2.0 Flash + Edge TTS ile
 * konuşmacı 1 = `tr-TR-EmelNeural`, konuşmacı 2 = `tr-TR-AhmetNeural` ile
 * sıra sıra synthesize edip ffmpeg-style birleştir.
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GROQ_API_KEY = process.env.GROQ_API_KEY

const GenerateContentSchema = z.object({
  notebookId: z.string().uuid(),
  contentType: z.enum(['audio_overview', 'flashcards', 'quiz', 'slides', 'summary', 'infographic']),
  config: z
    .object({
      duration: z.enum(['short', 'medium', 'long']).optional(), // 5, 10, 20 dk
      style: z.string().optional(), // 'casual', 'academic'
      language: z.string().length(2).optional(),
      cardCount: z.number().int().min(5).max(50).optional(), // flashcards/quiz için
      slideCount: z.number().int().min(5).max(30).optional(),
    })
    .default({}),
  sourceIds: z.array(z.string().uuid()).optional(), // belirli kaynaklara odaklan
})

// ===== LLM helpers =====

async function callGeminiJSON(prompt: string, model = 'gemini-2.0-flash-exp'): Promise<any> {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY missing')

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          responseMimeType: 'application/json',
          maxOutputTokens: 8192,
        },
      }),
    },
  )

  if (!res.ok) throw new Error(`Gemini: ${res.status} ${await res.text()}`)
  const data: any = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'
  return JSON.parse(text)
}

async function getNotebookContext(
  notebookId: string,
  userId: string,
  sourceIds?: string[],
): Promise<string> {
  let query = supabase
    .from('source_chunks')
    .select('text, section_title, source_id, notebook_sources!inner(title)')
    .eq('notebook_id', notebookId)
    .eq('user_id', userId)
    .order('chunk_index', { ascending: true })
    .limit(60) // toplam ~150k char

  if (sourceIds && sourceIds.length > 0) {
    query = query.in('source_id', sourceIds)
  }

  const { data } = await query

  // Kaynak başlığı + section title ile blok blok
  const grouped: Record<string, { title: string; chunks: string[] }> = {}
  for (const c of data ?? []) {
    const sId = c.source_id as string
    const sTitle = (c as any).notebook_sources?.title ?? 'Kaynak'
    if (!grouped[sId]) grouped[sId] = { title: sTitle, chunks: [] }
    grouped[sId].chunks.push(c.text as string)
  }

  return Object.values(grouped)
    .map((g) => `=== ${g.title} ===\n${g.chunks.join('\n\n')}`)
    .join('\n\n')
    .slice(0, 100_000) // hard cap
}

// ===== AUDIO OVERVIEW (Sesli Özet) =====

const AUDIO_DURATION_TARGETS = {
  short: { minutes: 5, turns: 12 },
  medium: { minutes: 10, turns: 20 },
  long: { minutes: 18, turns: 32 },
}

async function generateAudioScript(
  context: string,
  language: string,
  duration: 'short' | 'medium' | 'long' = 'medium',
): Promise<{ turns: Array<{ speaker: 'A' | 'B'; text: string }> }> {
  const target = AUDIO_DURATION_TARGETS[duration]

  const prompt =
    language === 'tr'
      ? `Sen Kavra'sın. Aşağıdaki kaynaklardan ${target.minutes} dakikalık bir Türkçe podcast diyaloğu üret.

İKİ KONUŞMACI:
- KONUŞMACI A: Kadın, "Ela" — meraklı, sorular soran, dinleyici perspektifi
- KONUŞMACI B: Erkek, "Mert" — uzman, açıklayıcı, örnek veren

KURALLAR:
1. Yaklaşık ${target.turns} sıra (turn). Her sıra 1-3 cümle.
2. DOĞAL TÜRKÇE. "Tabii ki", "yani", "şöyle düşün", "ilginç olan şey şu" gibi doğal geçişler.
3. AŞIRI RESMİ OLMA. Bir podcast'tesin, dostça konuş.
4. Hafif tereddüt ekle ("şey...", "ee", "hım"). Ama abartma.
5. Sayıları sözel yaz: "2025" → "iki bin yirmi beş"
6. İngilizce loanword'leri Türkçeleştir veya ilk geçişte parantezle aç. Örn: "API" → "uygulama programlama arayüzü (API)"
7. A başlar, B kapatır. "Hoş geldiniz Kavra Sesli Özet'e..." gibi giriş; "...bu kadardı bugünlük, bir sonraki defterde görüşmek üzere" gibi kapanış.
8. Kaynaklara dayanarak konuş, kaynaklarda olmayanı uydurma.

JSON FORMATINDA döndür, başka metin yok:
{
  "turns": [
    {"speaker": "A", "text": "..."},
    {"speaker": "B", "text": "..."}
  ]
}

KAYNAKLAR:
${context.slice(0, 80_000)}`
      : `Generate a ${target.minutes}-minute ${language} podcast dialog from these sources. 2 speakers (A=female "Ela", B=male "Mert"). ${target.turns} turns. Natural, friendly. JSON: {"turns":[{"speaker":"A","text":"..."}]}.\n\nSOURCES:\n${context.slice(0, 80_000)}`

  return await callGeminiJSON(prompt)
}

// ===== AUTO FLASHCARDS =====

async function generateFlashcards(
  context: string,
  language: string,
  count = 15,
): Promise<{
  cards: Array<{ front: string; back: string; type: 'qa' | 'cloze'; difficulty: 1 | 2 | 3 }>
}> {
  const prompt = `Aşağıdaki kaynaklardan ${count} adet flashcard üret.

KARTA KURALLAR:
- %70 Q&A formatı (front: soru, back: cevap)
- %30 cloze deletion (front: "[BLANK] hücrenin enerji üreten organelidir", back: "Mitokondri")
- HER KART ATOMİK olsun: tek bir kavram veya gerçek
- Bloom dağılımı: %40 hatırlama, %40 anlama, %20 uygulama
- Trivial soru sorma — sadece anlamlı, yeniden incelenmesi değerli kavramlar
- ${language === 'tr' ? 'Türkçe' : language} dilinde

JSON: {"cards":[{"front":"","back":"","type":"qa","difficulty":2}]}

KAYNAKLAR:
${context.slice(0, 60_000)}`

  return await callGeminiJSON(prompt)
}

// ===== AUTO QUIZ =====

async function generateQuiz(
  context: string,
  language: string,
  count = 10,
): Promise<{
  questions: Array<{
    question: string
    options: string[]
    correctIndex: number
    explanation: string
    bloom: string
  }>
}> {
  const prompt = `Aşağıdaki kaynaklardan ${count} çoktan seçmeli soru üret.

KURALLAR:
- 4 seçenek (1 doğru + 3 distractor)
- Distractorlar inanılır olsun:
  • Biri yaygın yanılgı
  • Biri anlamsal yakın ama yanlış
  • Biri yüzeysel benzer ama farklı bağlam
- Her sorunun 1-2 cümlelik açıklaması olsun (cevaptan sonra gösterilecek)
- Bloom dağılımı karışık: hatırla, anla, uygula, analiz et
- ${language === 'tr' ? 'Türkçe' : language}

JSON: {"questions":[{"question":"","options":["","","",""],"correctIndex":0,"explanation":"","bloom":"hatirla|anla|uygula|analiz"}]}

KAYNAKLAR:
${context.slice(0, 60_000)}`

  return await callGeminiJSON(prompt)
}

// ===== SLIDES =====

async function generateSlides(
  context: string,
  language: string,
  count = 10,
): Promise<{
  slides: Array<{
    layout: 'title' | 'bullet' | 'quote' | 'comparison' | 'closing'
    title?: string
    subtitle?: string
    bullets?: string[]
    quote?: string
    author?: string
    speakerNotes?: string
  }>
}> {
  const prompt = `Aşağıdaki kaynaklardan ${count} slaytlık bir sunum üret.

SLAYT TÜRLERİ:
- title: Açılış (başlık + alt başlık)
- bullet: Maddeli liste (3-5 madde)
- quote: Önemli alıntı veya tanım
- comparison: 2 kavram karşılaştırma (split layout)
- closing: Kapanış / özet / sorular

Slayt 1 = title, son slayt = closing, ortada karışık bullet/quote/comparison.

Her slayt için 30-60 saniyelik konuşma notu (speakerNotes) ekle.

${language === 'tr' ? 'Türkçe' : language} dilinde.

JSON: {"slides":[{"layout":"title","title":"","subtitle":"","speakerNotes":""}]}

KAYNAKLAR:
${context.slice(0, 60_000)}`

  return await callGeminiJSON(prompt)
}

// ===== INFOGRAPHIC (Mermaid) =====

async function generateInfographic(
  context: string,
  language: string,
): Promise<{
  mermaid: string
  title: string
  description: string
}> {
  const prompt = `Aşağıdaki kaynaklardan bir bilgi grafiği için Mermaid markdown üret.

EN UYGUN GRAFİK TİPİNİ SEÇ:
- flowchart: süreç akışı, neden-sonuç
- mindmap: kavram dallanması
- timeline: kronolojik gelişim
- sequenceDiagram: olay sırası
- pie: oran/dağılım

${language === 'tr' ? 'Türkçe' : language} kullan. Türkçe karakterler (ç, ğ, ş) çalışır.

JSON: {"mermaid":"\\n\`\`\`mermaid\\n[diagram code]\\n\`\`\`","title":"","description":""}

KAYNAKLAR:
${context.slice(0, 30_000)}`

  return await callGeminiJSON(prompt)
}

// ===== SUMMARY =====

async function generateSummary(
  context: string,
  language: string,
): Promise<{
  title: string
  summary: string
  keyPoints: string[]
}> {
  const prompt = `Aşağıdaki kaynaklardan kapsamlı bir özet üret.

İSTENEN:
- Başlık (kaynakların ana temasını yakalayan, 5-10 kelime)
- Özet (3-5 paragraf, ~500 kelime, akıcı prose)
- 5-8 maddelik anahtar nokta listesi

${language === 'tr' ? 'Türkçe' : language} dilinde, doğal bir akademik dille.

JSON: {"title":"","summary":"","keyPoints":["",""]}

KAYNAKLAR:
${context.slice(0, 80_000)}`

  return await callGeminiJSON(prompt)
}

// ===== Routes =====

export async function studioRoutes(fastify: FastifyInstance) {
  /** POST /api/studio/generate */
  fastify.post('/api/studio/generate', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const parsed = GenerateContentSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.format() })

    const { notebookId, contentType, config, sourceIds } = parsed.data

    // Notebook + Pro check
    const { data: notebook } = await supabase
      .from('notebooks')
      .select('language, title')
      .eq('id', notebookId)
      .eq('user_id', userId)
      .single()

    if (!notebook) return reply.code(404).send({ error: 'notebook_not_found' })

    const { data: ent } = await supabase
      .from('user_entitlements')
      .select('is_pro')
      .eq('user_id', userId)
      .single()

    // Audio overview Pro-only (en pahalı)
    if (contentType === 'audio_overview' && !ent?.is_pro) {
      return reply.code(403).send({
        error: 'pro_required',
        message: "Sesli Özet Pro özelliği. Ayda 5 podcast Pro tier'da.",
      })
    }

    // Free user'lara aylık quota
    if (!ent?.is_pro) {
      const monthStart = new Date()
      monthStart.setDate(1)
      monthStart.setHours(0, 0, 0, 0)
      const { count } = await supabase
        .from('generated_content')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', monthStart.toISOString())

      const FREE_LIMIT = 10
      if ((count ?? 0) >= FREE_LIMIT) {
        return reply.code(403).send({
          error: 'free_limit',
          message: `Free üyeler aylık ${FREE_LIMIT} içerik üretebilir. Pro\'ya geç sınırsız aç.`,
        })
      }
    }

    // Kayıt oluştur
    const titleMap: Record<string, string> = {
      audio_overview: '🎙️ Sesli Özet',
      flashcards: '🃏 Bilgi Kartları',
      quiz: '✓ Test',
      slides: '📊 Slayt Sunusu',
      summary: '📄 Özet',
      infographic: '📈 İnfografik',
    }

    const { data: generated, error } = await supabase
      .from('generated_content')
      .insert({
        notebook_id: notebookId,
        user_id: userId,
        content_type: contentType,
        title: `${titleMap[contentType]} — ${notebook.title}`,
        config,
        source_ids: sourceIds ?? [],
        status: 'processing',
      })
      .select()
      .single()

    if (error) return reply.code(500).send({ error: error.message })

    // Background processing
    setImmediate(async () => {
      const startTime = Date.now()
      try {
        const language = config.language ?? notebook.language ?? 'tr'
        const context = await getNotebookContext(notebookId, userId, sourceIds)

        if (!context || context.length < 200) {
          throw new Error('Defterde yeterli içerik yok. Önce kaynak yükle ve işlenmesini bekle.')
        }

        let result: any
        const model = 'gemini-2.0-flash'

        if (contentType === 'audio_overview') {
          const script = await generateAudioScript(context, language, config.duration)
          // Save script (audio synthesis ayrı endpoint'te)
          await supabase.from('podcast_scripts').insert({
            generated_content_id: generated.id,
            turns: script.turns,
            total_turns: script.turns.length,
            total_chars: script.turns.reduce((s: number, t: any) => s + t.text.length, 0),
            language,
          })
          result = script
        } else if (contentType === 'flashcards') {
          result = await generateFlashcards(context, language, config.cardCount)
        } else if (contentType === 'quiz') {
          result = await generateQuiz(context, language, config.cardCount)
        } else if (contentType === 'slides') {
          result = await generateSlides(context, language, config.slideCount)
        } else if (contentType === 'infographic') {
          result = await generateInfographic(context, language)
        } else if (contentType === 'summary') {
          result = await generateSummary(context, language)
        } else {
          throw new Error(`Unsupported content type: ${contentType}`)
        }

        await supabase
          .from('generated_content')
          .update({
            status: 'ready',
            raw_content: result,
            model,
            generation_seconds: Math.floor((Date.now() - startTime) / 1000),
            ready_at: new Date().toISOString(),
          })
          .eq('id', generated.id)

        await supabase.rpc('recount_notebook_aggregates', { p_notebook_id: notebookId })
      } catch (err: any) {
        await supabase
          .from('generated_content')
          .update({
            status: 'failed',
            error_message: err.message ?? 'Unknown error',
          })
          .eq('id', generated.id)
        fastify.log.error(err, 'Studio generation hata')
      }
    })

    return { generated }
  })

  /** GET /api/studio/:id */
  fastify.get<{ Params: { id: string } }>('/api/studio/:id', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const { data } = await supabase
      .from('generated_content')
      .select('*, podcast_scripts(*)')
      .eq('id', req.params.id)
      .eq('user_id', userId)
      .single()

    if (!data) return reply.code(404).send({ error: 'not_found' })

    // Audio overview için signed URL üret
    if (data.content_type === 'audio_overview' && data.storage_path) {
      const { data: urlData } = await supabase.storage
        .from('notebook-outputs')
        .createSignedUrl(data.storage_path, 3600)
      ;(data as any).audioUrl = urlData?.signedUrl
    }

    return data
  })

  /** DELETE /api/studio/:id */
  fastify.delete<{ Params: { id: string } }>('/api/studio/:id', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const { data: gen } = await supabase
      .from('generated_content')
      .select('storage_path, notebook_id')
      .eq('id', req.params.id)
      .eq('user_id', userId)
      .single()

    if (gen?.storage_path) {
      await supabase.storage.from('notebook-outputs').remove([gen.storage_path])
    }

    await supabase.from('generated_content').delete().eq('id', req.params.id)

    if (gen?.notebook_id) {
      await supabase.rpc('recount_notebook_aggregates', { p_notebook_id: gen.notebook_id })
    }

    return { ok: true }
  })
}
