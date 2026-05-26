import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { groqChatJSON } from '../groq.js'
import { getActiveGroqKey, supabase, verifyUserToken } from '../supabase.js'

const GenerateSchema = z.object({
  source: z.enum(['concept', 'document', 'subject']),
  sourceId: z.string().uuid(),
  questionCount: z.number().int().min(3).max(20).default(8),
  difficulty: z.enum(['easy', 'medium', 'hard', 'mixed']).default('mixed'),
  types: z
    .array(z.enum(['multiple_choice', 'true_false', 'open_ended', 'fill_blank']))
    .default(['multiple_choice', 'true_false']),
})

const SubmitSchema = z.object({
  quizId: z.string().uuid(),
  answers: z.array(
    z.object({
      questionId: z.string().uuid(),
      userAnswer: z.string(),
      timeSpentMs: z.number().int().optional(),
    }),
  ),
})

interface GeneratedQuestion {
  type: 'multiple_choice' | 'true_false' | 'open_ended' | 'fill_blank'
  prompt: string
  choices?: { a: string; b: string; c: string; d: string }
  correct_answer: string
  explanation: string
  difficulty: number
}

export async function quizRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/quiz/generate
   * Concept / Document / Subject'ten quiz üret.
   */
  fastify.post('/api/quiz/generate', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const parsed = GenerateSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.format() })

    const apiKey = await getActiveGroqKey(userId)
    if (!apiKey) return reply.code(400).send({ error: 'no_active_key' })

    const { source, sourceId, questionCount, difficulty, types } = parsed.data

    // Kaynak içeriği topla
    let contextText = ''
    let title = ''
    let subjectId: string | null = null
    let conceptId: string | null = null
    let documentId: string | null = null

    if (source === 'concept') {
      const { data } = await supabase
        .from('concepts')
        .select('name, description, subject_id, subjects(user_id)')
        .eq('id', sourceId)
        .single()
      if (!data || (data as any).subjects?.user_id !== userId) {
        return reply.code(404).send({ error: 'not_found' })
      }
      title = `${data.name} Quizi`
      contextText = `Kavram: ${data.name}\n${data.description ?? ''}`
      subjectId = data.subject_id
      conceptId = sourceId
    } else if (source === 'document') {
      const { data: doc } = await supabase
        .from('documents')
        .select('filename, subject_id, extracted_text, user_id')
        .eq('id', sourceId)
        .single()
      if (!doc || doc.user_id !== userId) {
        return reply.code(404).send({ error: 'not_found' })
      }
      title = `${doc.filename} Quizi`
      contextText = (doc.extracted_text ?? '').slice(0, 8000)
      subjectId = doc.subject_id
      documentId = sourceId
    } else {
      // subject
      const { data: subj } = await supabase
        .from('subjects')
        .select('name, description, user_id')
        .eq('id', sourceId)
        .single()
      if (!subj || subj.user_id !== userId) {
        return reply.code(404).send({ error: 'not_found' })
      }
      title = `${subj.name} Genel Quizi`

      // Subject'in tüm concept'lerini topla
      const { data: concepts } = await supabase
        .from('concepts')
        .select('name, description')
        .eq('subject_id', sourceId)
      contextText = `Konu: ${subj.name}\n\nKavramlar:\n${(concepts ?? [])
        .map((c: any) => `- ${c.name}: ${c.description ?? ''}`)
        .join('\n')}`
      subjectId = sourceId
    }

    if (contextText.length < 50) {
      return reply.code(400).send({
        error: 'insufficient_content',
        message: 'Quiz üretmek için yeterli içerik yok',
      })
    }

    const difficultyDesc =
      difficulty === 'easy'
        ? 'Kolay seviye, temel hatırlama'
        : difficulty === 'hard'
          ? 'Zorlu, uygulama ve analiz seviyesi'
          : difficulty === 'mixed'
            ? 'Karışık zorluk: bazı kolay, bazı orta, bazı zor'
            : 'Orta seviye, anlama'

    const typesDesc = types.join(', ')

    try {
      const result = await groqChatJSON<{ questions: GeneratedQuestion[] }>({
        apiKey,
        jsonMode: true,
        temperature: 0.5,
        maxTokens: 4096,
        systemPrompt: `Sen bir Türkçe konuşan eğitim materyali tasarımcısısın. Verilen içerikten quiz üret.

Kurallar:
- ${questionCount} soru üret
- Tip: ${typesDesc}
- Zorluk: ${difficultyDesc}
- Sorular Türkçe, net, tek doğru cevaplı
- Multiple choice için 4 şık (a, b, c, d), şıklar makul yanlışlar olsun (tuzak)
- Her soruda 1-2 cümlelik açıklama (explanation)
- True/false soruları yanıltıcı olmasın

Çıktı KESINLIKLE bu JSON:
{
  "questions": [
    {
      "type": "multiple_choice",
      "prompt": "Soru metni?",
      "choices": { "a": "...", "b": "...", "c": "...", "d": "..." },
      "correct_answer": "b",
      "explanation": "Niçin doğru.",
      "difficulty": 1-5
    },
    {
      "type": "true_false",
      "prompt": "İfade.",
      "correct_answer": "true",
      "explanation": "...",
      "difficulty": 2
    }
  ]
}`,
        userPrompt: `İÇERİK:\n\n${contextText}`,
      })

      const questions = result.questions ?? []
      if (questions.length === 0) {
        return reply.code(500).send({ error: 'no_questions_generated' })
      }

      // Quiz kaydı
      const { data: quiz, error: quizErr } = await supabase
        .from('quizzes')
        .insert({
          user_id: userId,
          subject_id: subjectId,
          concept_id: conceptId,
          document_id: documentId,
          title,
          question_count: questions.length,
          difficulty_avg:
            questions.reduce((sum, q) => sum + (q.difficulty ?? 2), 0) / questions.length,
        })
        .select()
        .single()
      if (quizErr) throw quizErr

      // Soruları kaydet
      const rows = questions.map((q, i) => ({
        quiz_id: quiz.id,
        position: i,
        type: q.type,
        prompt: q.prompt,
        choices: q.choices ?? null,
        correct_answer: q.correct_answer,
        explanation: q.explanation,
        difficulty: Math.max(1, Math.min(5, q.difficulty ?? 2)),
      }))

      await supabase.from('quiz_questions').insert(rows)

      return { quizId: quiz.id, questionCount: questions.length }
    } catch (err: any) {
      fastify.log.error(err)
      return reply.code(500).send({ error: 'gen_failed', message: err.message })
    }
  })

  /**
   * GET /api/quiz/:id
   * Quiz + soruları (correct_answer'sız, kullanıcıya çözmek için)
   */
  fastify.get<{ Params: { id: string } }>('/api/quiz/:id', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const { data: quiz } = await supabase
      .from('quizzes')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', userId)
      .single()
    if (!quiz) return reply.code(404).send({ error: 'not_found' })

    const { data: questions } = await supabase
      .from('quiz_questions')
      .select('id, position, type, prompt, choices, difficulty')
      .eq('quiz_id', quiz.id)
      .order('position', { ascending: true })

    return { quiz, questions: questions ?? [] }
  })

  /**
   * POST /api/quiz/submit
   * Cevapları gönder, sonuç + error portfolio kayıtları üret.
   */
  fastify.post('/api/quiz/submit', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const parsed = SubmitSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.format() })
    const { quizId, answers } = parsed.data

    // Quiz sahipliği
    const { data: quiz } = await supabase
      .from('quizzes')
      .select('id, subject_id, concept_id, user_id')
      .eq('id', quizId)
      .eq('user_id', userId)
      .single()
    if (!quiz) return reply.code(404).send({ error: 'not_found' })

    // Soruları çek (correct_answer'la birlikte)
    const { data: questions } = await supabase
      .from('quiz_questions')
      .select('id, type, prompt, correct_answer, explanation, difficulty')
      .eq('quiz_id', quizId)

    const qById = new Map((questions ?? []).map((q: any) => [q.id, q]))

    let correctCount = 0
    const results: Array<{
      questionId: string
      isCorrect: boolean
      userAnswer: string
      correctAnswer: string
      explanation: string
    }> = []

    for (const ans of answers) {
      const q = qById.get(ans.questionId) as any
      if (!q) continue

      const isCorrect = normalizeAnswer(ans.userAnswer) === normalizeAnswer(q.correct_answer)
      if (isCorrect) correctCount++

      // Attempt kaydı
      await supabase.from('quiz_attempts').insert({
        user_id: userId,
        quiz_id: quizId,
        question_id: ans.questionId,
        user_answer: ans.userAnswer,
        is_correct: isCorrect,
        time_spent_ms: ans.timeSpentMs ?? null,
      })

      // Yanlışsa error_portfolio'ya
      if (!isCorrect) {
        await supabase.from('error_portfolio').insert({
          user_id: userId,
          subject_id: quiz.subject_id,
          concept_id: quiz.concept_id,
          source_type: 'quiz',
          source_id: ans.questionId,
          user_answer: ans.userAnswer,
          correct_answer: q.correct_answer,
          mistake_summary: `${q.prompt.slice(0, 100)}... için yanlış cevap`,
        })
      }

      results.push({
        questionId: ans.questionId,
        isCorrect,
        userAnswer: ans.userAnswer,
        correctAnswer: q.correct_answer,
        explanation: q.explanation ?? '',
      })
    }

    return {
      score: correctCount,
      total: answers.length,
      accuracy: answers.length > 0 ? correctCount / answers.length : 0,
      results,
    }
  })
}

function normalizeAnswer(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[.,!?]/g, '')
}
