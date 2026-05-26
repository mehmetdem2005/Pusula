import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { groqChatJSON } from '../groq.js'
import { getActiveGroqKey, supabase, verifyUserToken } from '../supabase.js'

const ReflectionUpsertSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  mood: z.number().int().min(1).max(5).optional(),
  energy: z.number().int().min(1).max(5).optional(),
  what_learned: z.string().max(2000).optional(),
  what_struggled: z.string().max(2000).optional(),
  tomorrow_focus: z.string().max(500).optional(),
})

export async function reflectionsRoutes(fastify: FastifyInstance) {
  /** GET /api/reflections — son N gün */
  fastify.get<{ Querystring: { days?: string } }>('/api/reflections', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const days = Math.min(90, Number(req.query.days ?? 30))
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

    const { data, error } = await supabase
      .from('reflections')
      .select('*')
      .eq('user_id', userId)
      .gte('date', since)
      .order('date', { ascending: false })

    if (error) return reply.code(500).send({ error: error.message })
    return { reflections: data ?? [] }
  })

  /** POST /api/reflections — bir günü upsert */
  fastify.post('/api/reflections', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const parsed = ReflectionUpsertSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.format() })

    const { error } = await supabase
      .from('reflections')
      .upsert({ user_id: userId, ...parsed.data }, { onConflict: 'user_id,date' })

    if (error) return reply.code(500).send({ error: error.message })

    // Achievement kontrolü — reflection_7
    await supabase.rpc('check_achievements', { p_user_id: userId })

    return { ok: true }
  })

  /**
   * POST /api/reports/weekly — bu hafta için AI rapor üret (idempotent)
   */
  fastify.post<{ Body: { weekStart?: string } }>('/api/reports/weekly', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const apiKey = await getActiveGroqKey(userId)
    if (!apiKey) return reply.code(400).send({ error: 'no_active_key' })

    // Bu haftanın pazartesi
    const weekStart = req.body?.weekStart
      ? new Date(req.body.weekStart)
      : (() => {
          const d = new Date()
          const day = d.getDay()
          const diff = d.getDate() - day + (day === 0 ? -6 : 1)
          d.setDate(diff)
          d.setHours(0, 0, 0, 0)
          return d
        })()

    const weekStartStr = weekStart.toISOString().slice(0, 10)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)
    const weekEndStr = weekEnd.toISOString().slice(0, 10)

    // Cache: zaten bu hafta için rapor üretildi mi?
    const { data: existing } = await supabase
      .from('weekly_reports')
      .select('*')
      .eq('user_id', userId)
      .eq('week_start', weekStartStr)
      .maybeSingle()

    if (existing && existing.ai_narrative) {
      return { report: existing, cached: true }
    }

    // Metrikleri çek
    const { data: metricsRows } = await supabase.rpc('get_weekly_metrics', {
      p_user_id: userId,
      p_week_start: weekStartStr,
    })
    const metrics: any = metricsRows?.[0] ?? {}

    // Bu haftanın reflection'ları
    const { data: refs } = await supabase
      .from('reflections')
      .select('date, mood, energy, what_learned, what_struggled')
      .eq('user_id', userId)
      .gte('date', weekStartStr)
      .lte('date', weekEndStr)
      .order('date', { ascending: true })

    if ((metrics.total_lessons ?? 0) === 0) {
      return reply.code(200).send({ report: null, message: 'Bu hafta aktivite yok' })
    }

    try {
      // AI narrative
      const result = await groqChatJSON<{
        narrative: string
        recommendations: string[]
      }>({
        apiKey,
        jsonMode: true,
        temperature: 0.6,
        systemPrompt: `Sen Kavra'sın — kullanıcının haftalık öğrenme raporunu yazıyorsun.
Sıcak, samimi, Türkçe. Yargılamadan; başarıyı kutla, zorluğu normalize et, gelecek hafta için somut öner.
3-5 paragraf narrative + 2-4 öneri.

JSON çıktı:
{
  "narrative": "Markdown formatında metin (## başlık, **kalın**, - liste serbest)",
  "recommendations": ["Öneri 1", "Öneri 2"]
}`,
        userPrompt: `Hafta: ${weekStartStr} — ${weekEndStr}

METRİKLER:
- Toplam ders: ${metrics.total_lessons ?? 0}
- Toplam çalışma: ${metrics.total_minutes ?? 0} dakika
- Flashcard tekrarı: ${metrics.total_reviews ?? 0}
- Quiz denemesi: ${metrics.total_quiz_attempts ?? 0}
- Quiz isabet: %${Math.round((metrics.quiz_accuracy ?? 0) * 100)}
- En çok kullanılan teknik: ${metrics.most_used_technique_name ?? '-'}
- En aktif konu: ${metrics.most_active_subject_name ?? '-'}
- En verimli gün: ${metrics.best_day ?? '-'}

GÜNLÜK YANSIMALAR:
${
  (refs ?? [])
    .map(
      (r: any) =>
        `${r.date} (mood:${r.mood ?? '-'}, enerji:${r.energy ?? '-'}): ` +
        `${r.what_learned ? `Öğrendi: "${r.what_learned}". ` : ''}` +
        `${r.what_struggled ? `Zorlandı: "${r.what_struggled}". ` : ''}`,
    )
    .join('\n') || 'Bu hafta yansıma yazmamış.'
}`,
      })

      // Upsert
      const { data: report, error: upErr } = await supabase
        .from('weekly_reports')
        .upsert(
          {
            user_id: userId,
            week_start: weekStartStr,
            week_end: weekEndStr,
            total_minutes: metrics.total_minutes ?? 0,
            total_lessons: metrics.total_lessons ?? 0,
            total_reviews: metrics.total_reviews ?? 0,
            total_quiz_attempts: metrics.total_quiz_attempts ?? 0,
            quiz_accuracy: metrics.quiz_accuracy,
            most_used_technique_id: metrics.most_used_technique_id,
            highlights: {
              most_active_subject: metrics.most_active_subject_name,
              best_day: metrics.best_day,
            },
            ai_narrative: result.narrative,
            ai_recommendations: result.recommendations,
          },
          { onConflict: 'user_id,week_start' },
        )
        .select()
        .single()
      if (upErr) throw upErr

      return { report, cached: false }
    } catch (err: any) {
      fastify.log.error(err)
      return reply.code(500).send({ error: 'report_failed', message: err.message })
    }
  })

  /** GET /api/reports/weekly?weekStart=2025-... */
  fastify.get<{ Querystring: { weekStart?: string } }>(
    '/api/reports/weekly',
    async (req, reply) => {
      const userId = await verifyUserToken(req.headers.authorization)
      if (!userId) return reply.code(401).send({ error: 'unauthorized' })

      let q = supabase
        .from('weekly_reports')
        .select('*')
        .eq('user_id', userId)
        .order('week_start', { ascending: false })
        .limit(12)

      if (req.query.weekStart) q = q.eq('week_start', req.query.weekStart)

      const { data } = await q
      return { reports: data ?? [] }
    },
  )
}
