import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { embedTexts } from '../embeddings.js'
import { groqChatJSON, groqVision } from '../groq.js'
import { chunkText, parsePDF } from '../pdf-parser.js'
import { getActiveGroqKey, supabase, verifyUserToken } from '../supabase.js'

const ProcessSchema = z.object({
  documentId: z.string().uuid(),
})

const ExtractConceptsSchema = z.object({
  documentId: z.string().uuid(),
})

const GenerateFlashcardsSchema = z.object({
  documentId: z.string().uuid(),
  maxPerChunk: z.number().int().min(1).max(8).default(3),
})

interface ExtractedConcept {
  name: string
  description: string
  difficulty: number
  prerequisites?: string[]
}

interface GeneratedFlashcard {
  front: string
  back: string
  hint?: string
  difficulty: number
}

export async function pdfRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/documents/:id/process
   * Storage'dan PDF'i indir → parse → chunk → embed → DB'ye kaydet
   */
  fastify.post('/api/documents/process', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const parsed = ProcessSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.format() })
    const { documentId } = parsed.data

    // Doküman kaydını al
    const { data: doc, error: docErr } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', userId)
      .single()
    if (docErr || !doc) return reply.code(404).send({ error: 'not_found' })

    // Status'u güncelle
    await supabase.from('documents').update({ status: 'processing' }).eq('id', documentId)

    try {
      // 1. PDF'i Storage'dan indir
      const { data: blob, error: dlErr } = await supabase.storage
        .from('user-documents')
        .download(doc.storage_path)
      if (dlErr || !blob) throw new Error(`İndirme: ${dlErr?.message}`)

      const buffer = Buffer.from(await blob.arrayBuffer())

      // 2. Parse
      const pdfData = await parsePDF(buffer)

      if (!pdfData.hasText) {
        // Tarama PDF'i — şimdilik vision'a yönlendir, ya da hata
        await supabase
          .from('documents')
          .update({
            status: 'failed',
            error_message: "PDF metni çıkarılamadı (taranmış olabilir). OCR Faz 4'te.",
          })
          .eq('id', documentId)
        return reply.code(422).send({ error: 'no_text', message: 'PDF metin içermiyor' })
      }

      // 3. Chunking
      const chunks = chunkText(pdfData)

      if (chunks.length === 0) {
        throw new Error('Metin çok kısa, chunk üretilemedi')
      }

      // 4. Embeddings
      const embeddings = await embedTexts(chunks.map((c) => c.text))

      // 5. DB'ye yaz (chunks)
      const insertRows = chunks.map((c, i) => ({
        document_id: documentId,
        chunk_index: c.index,
        content: c.text,
        page_number: c.pageNumber,
        embedding: embeddings[i] as any, // pgvector Json olarak insert
        tokens: Math.ceil(c.text.length / 4),
      }))

      const { error: insErr } = await supabase.from('document_chunks').insert(insertRows)
      if (insErr) throw insErr

      // 6. Doküman status'u
      await supabase
        .from('documents')
        .update({
          status: 'ready',
          page_count: pdfData.pageCount,
          extracted_text: pdfData.pages
            .map((p) => p.text)
            .join('\n\n')
            .slice(0, 50000),
        })
        .eq('id', documentId)

      return {
        ok: true,
        pageCount: pdfData.pageCount,
        chunkCount: chunks.length,
        totalChars: pdfData.totalChars,
      }
    } catch (err: any) {
      fastify.log.error(err, 'PDF process failed')
      await supabase
        .from('documents')
        .update({ status: 'failed', error_message: err.message?.slice(0, 500) })
        .eq('id', documentId)
      return reply.code(500).send({ error: 'process_failed', message: err.message })
    }
  })

  /**
   * POST /api/documents/extract-concepts
   * Doküman chunk'larından AI ile concept çıkar (kullanıcı onayına sun)
   */
  fastify.post('/api/documents/extract-concepts', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const parsed = ExtractConceptsSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.format() })

    const apiKey = await getActiveGroqKey(userId)
    if (!apiKey) return reply.code(400).send({ error: 'no_active_key' })

    const { data: doc } = await supabase
      .from('documents')
      .select('id, subject_id, extracted_text, filename')
      .eq('id', parsed.data.documentId)
      .eq('user_id', userId)
      .single()
    if (!doc) return reply.code(404).send({ error: 'not_found' })

    if (!doc.subject_id) {
      return reply.code(400).send({
        error: 'no_subject',
        message: 'Bu dokümanın bir konuya bağlanması gerekli',
      })
    }

    const text = (doc.extracted_text ?? '').slice(0, 30000)

    try {
      const result = await groqChatJSON<{ concepts: ExtractedConcept[] }>({
        apiKey,
        jsonMode: true,
        temperature: 0.3,
        systemPrompt: `Sen bir pedagojik içerik analizcisisin. Verilen ders metninden öğrenilmesi gereken
ana kavramları çıkar. Her kavram öz, anlaşılır ve sınava değer olmalı.

Çıktı formatı (kesinlikle bu JSON):
{
  "concepts": [
    {
      "name": "Kavram adı (kısa, max 5 kelime)",
      "description": "1-2 cümle açıklama",
      "difficulty": 1-5,
      "prerequisites": ["Önceden bilinmesi gereken kavramlar"]
    }
  ]
}

5-15 kavram üret. Trivia değil, gerçekten anlaşılması gerekenleri seç.`,
        userPrompt: `Doküman: ${doc.filename}\n\n${text}`,
      })

      // Önerileri henüz DB'ye yazmıyoruz; kullanıcı onayına sunuyoruz
      return {
        documentId: doc.id,
        concepts: result.concepts ?? [],
      }
    } catch (err: any) {
      fastify.log.error(err)
      return reply.code(500).send({ error: 'extraction_failed', message: err.message })
    }
  })

  /**
   * POST /api/documents/generate-flashcards
   * Onaylanmış chunk'lardan flashcard üret → generated_flashcards tablosuna pending olarak yaz
   */
  fastify.post('/api/documents/generate-flashcards', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const parsed = GenerateFlashcardsSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.format() })
    const { documentId, maxPerChunk } = parsed.data

    const apiKey = await getActiveGroqKey(userId)
    if (!apiKey) return reply.code(400).send({ error: 'no_active_key' })

    const { data: chunks } = await supabase
      .from('document_chunks')
      .select('id, content')
      .eq('document_id', documentId)
      .order('chunk_index', { ascending: true })
      .limit(20) // güvenlik: çok büyük PDF'lerde maliyet kontrolü

    if (!chunks || chunks.length === 0) {
      return reply.code(404).send({ error: 'no_chunks' })
    }

    let totalGenerated = 0

    try {
      for (const chunk of chunks) {
        const result = await groqChatJSON<{ flashcards: GeneratedFlashcard[] }>({
          apiKey,
          jsonMode: true,
          temperature: 0.4,
          systemPrompt: `Verilen ders metninden Anki tarzı flashcard'lar üret.
Her kart:
- front: net soru veya boşluk doldurma (max 100 karakter)
- back: özlü cevap (max 200 karakter)
- hint: opsiyonel ipucu (max 50 karakter)
- difficulty: 1-5

Çıktı formatı:
{
  "flashcards": [
    { "front": "...", "back": "...", "hint": "...", "difficulty": 1-5 }
  ]
}

Maksimum ${maxPerChunk} kart üret. Sadece gerçekten ezbere değer bilgileri seç.
Türkçe yaz. Tarihler, formüller, tanımlar, isimler için ideal.`,
          userPrompt: chunk.content.slice(0, 4000),
        })

        const cards = result.flashcards ?? []
        if (cards.length === 0) continue

        const insertRows = cards.map((c) => ({
          user_id: userId,
          document_id: documentId,
          chunk_id: chunk.id,
          front: c.front.slice(0, 500),
          back: c.back.slice(0, 1000),
          hint: c.hint?.slice(0, 200) ?? null,
          difficulty: Math.max(1, Math.min(5, c.difficulty ?? 2)),
          status: 'pending',
        }))

        await supabase.from('generated_flashcards').insert(insertRows)
        totalGenerated += cards.length
      }

      return { ok: true, generated: totalGenerated }
    } catch (err: any) {
      fastify.log.error(err)
      return reply.code(500).send({ error: 'gen_failed', message: err.message })
    }
  })

  /**
   * POST /api/vision/analyze
   * Resim + task → AI cevap. Storage path veya base64 alır.
   */
  fastify.post<{
    Body: {
      storagePath?: string
      imageBase64?: string
      mimeType?: string
      task: string
      lessonId?: string
    }
  }>('/api/vision/analyze', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const { storagePath, imageBase64, mimeType, task, lessonId } = req.body
    if (!task) return reply.code(400).send({ error: 'task_required' })

    const apiKey = await getActiveGroqKey(userId)
    if (!apiKey) return reply.code(400).send({ error: 'no_active_key' })

    let base64 = imageBase64
    let mt = mimeType ?? 'image/jpeg'

    if (storagePath) {
      // Storage'tan indir
      if (!storagePath.startsWith(`${userId}/`)) {
        return reply.code(403).send({ error: 'forbidden_path' })
      }
      const { data: blob } = await supabase.storage.from('user-images').download(storagePath)
      if (!blob) return reply.code(404).send({ error: 'image_not_found' })
      const buf = Buffer.from(await blob.arrayBuffer())
      base64 = buf.toString('base64')
      mt = blob.type || 'image/jpeg'
    }

    if (!base64) return reply.code(400).send({ error: 'no_image' })

    const taskPrompts: Record<string, string> = {
      solve_math:
        'Bu bir matematik sorusu. Çöz ve adım adım açıkla. Türkçe. LaTeX kullanabilirsin ($...$).',
      extract_text:
        'Bu resimdeki tüm metni olduğu gibi (el yazısı dahil) çıkar. Sadece metin, başka açıklama yok.',
      describe: 'Bu resmi detaylıca açıkla. Eğitim amaçlı bir öğrenciye gösterilecek.',
      analyze_diagram: 'Bu bir diyagram veya şema. Ne anlattığını parça parça açıkla. Türkçe.',
      explain_handwriting: 'Bu el yazısı not. Önce metni transcribe et, sonra konuyu açıkla.',
    }
    const prompt = taskPrompts[task] ?? task

    try {
      const result = await groqVision({ apiKey, imageBase64: base64, mimeType: mt, prompt })

      // Görsel kaydını DB'ye logla
      if (storagePath) {
        await supabase.from('images').insert({
          user_id: userId,
          lesson_id: lessonId ?? null,
          storage_path: storagePath,
          analysis_result: result.slice(0, 5000),
        })
      }

      return { result }
    } catch (err: any) {
      fastify.log.error(err)
      return reply.code(500).send({ error: 'vision_failed', message: err.message })
    }
  })
}
