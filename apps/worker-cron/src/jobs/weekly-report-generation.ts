import type { Logger } from 'pino'
import { sendExpoPushBatch, supabase } from '../supabase.js'

interface JobContext {
  logger: Logger
}

/**
 * Weekly Report Generation
 * ========================
 *
 * Pazartesi 09:00 UTC çalışır. Geçen haftanın AI raporunu üretir
 * (kullanıcı henüz açmadıysa). Bittiğinde kullanıcıya "haftalık raporun hazır"
 * pushu gönderir.
 *
 * Geçen haftanın metrikleri var ama narrative AI tarafından üretilmemişse,
 * burada Groq'a istek atıyoruz. Bu cron worker'ın LLM erişimi gerek.
 *
 * Maliyet: ~1000 aktif kullanıcı, her biri için ~3sn Groq → 1000 * $0.0003 ≈ $0.30/hafta
 *
 * NOT: Kullanıcı kendi Groq key'ini kullanıyor olduğu için bu cron worker'ında
 * sistem-genel bir Groq key (ANTHROPIC paid Groq hesabı) kullanıyoruz.
 * Sadece weekly report için, çünkü en kullanışlı premium feature.
 */
export async function runWeeklyReportGeneration({ logger }: JobContext): Promise<void> {
  const { data: jobRun } = await supabase
    .from('cron_job_runs')
    .insert({ job_name: 'weekly_report_generation' })
    .select()
    .single()

  let usersProcessed = 0
  let usersSucceeded = 0
  let usersFailed = 0

  try {
    // Geçen haftanın pazartesi
    const now = new Date()
    const lastMonday = new Date(now)
    lastMonday.setUTCDate(now.getUTCDate() - 7 - now.getUTCDay() + 1)
    lastMonday.setUTCHours(0, 0, 0, 0)
    const weekStartStr = lastMonday.toISOString().slice(0, 10)

    // Geçen hafta aktif olan kullanıcıları bul
    const lastWeekStart = lastMonday.toISOString()
    const lastWeekEnd = new Date(lastMonday.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()

    const { data: activeUsers } = await supabase
      .from('lessons')
      .select('user_id')
      .gte('started_at', lastWeekStart)
      .lt('started_at', lastWeekEnd)

    const userIds = [...new Set((activeUsers ?? []).map((u: any) => u.user_id))]
    logger.info({ count: userIds.length, weekStart: weekStartStr }, 'Aktif kullanıcılar')

    // Notification tercihi olan ve henüz raporu yoksa filter
    const { data: prefs } = await supabase
      .from('user_preferences')
      .select('user_id, notify_weekly_report')
      .in('user_id', userIds)
      .eq('notify_weekly_report', true)

    const wantingUsers = (prefs ?? []).map((p: any) => p.user_id)

    const { data: existing } = await supabase
      .from('weekly_reports')
      .select('user_id')
      .in('user_id', wantingUsers)
      .eq('week_start', weekStartStr)

    const alreadyDone = new Set((existing ?? []).map((r: any) => r.user_id))
    const toGenerate = wantingUsers.filter((id) => !alreadyDone.has(id))

    logger.info(
      { toGenerate: toGenerate.length, alreadyDone: alreadyDone.size },
      'Üretilecek raporlar',
    )

    const messages: Parameters<typeof sendExpoPushBatch>[0] = []

    // Her kullanıcı için: önce metrikleri al, sonra Groq ile narrative üret
    const SYSTEM_GROQ_KEY = process.env.SYSTEM_GROQ_KEY

    for (const userId of toGenerate) {
      usersProcessed++
      try {
        const { data: metricsRows } = await supabase.rpc('get_weekly_metrics', {
          p_user_id: userId,
          p_week_start: weekStartStr,
        })
        const metrics: any = metricsRows?.[0] ?? {}

        if ((metrics.total_lessons ?? 0) === 0) continue

        // Narrative
        let narrative: string | null = null
        let recommendations: string[] = []

        if (SYSTEM_GROQ_KEY) {
          try {
            const llmRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${SYSTEM_GROQ_KEY}`,
              },
              body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                response_format: { type: 'json_object' },
                temperature: 0.6,
                max_tokens: 1500,
                messages: [
                  {
                    role: 'system',
                    content: `Türkçe, sıcak, samimi haftalık öğrenme raporu yaz.
JSON: {"narrative":"3 paragraf markdown","recommendations":["öneri1","öneri2","öneri3"]}`,
                  },
                  {
                    role: 'user',
                    content: `Hafta ${weekStartStr}: ${metrics.total_lessons} ders, ${metrics.total_minutes} dk, ${metrics.total_reviews} tekrar, %${Math.round((metrics.quiz_accuracy ?? 0) * 100)} quiz isabet, en aktif konu: ${metrics.most_active_subject_name ?? '-'}`,
                  },
                ],
              }),
            })
            if (llmRes.ok) {
              const data: any = await llmRes.json()
              const parsed = JSON.parse(data.choices[0].message.content)
              narrative = parsed.narrative
              recommendations = parsed.recommendations ?? []
            }
          } catch (e) {
            logger.warn({ e, userId }, 'Groq narrative üretemedi, metric-only kayıt')
          }
        }

        const weekEnd = new Date(lastMonday.getTime() + 6 * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10)

        await supabase.from('weekly_reports').upsert(
          {
            user_id: userId,
            week_start: weekStartStr,
            week_end: weekEnd,
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
            ai_narrative: narrative,
            ai_recommendations: recommendations,
          },
          { onConflict: 'user_id,week_start' },
        )

        // Push gönder
        const { data: tokens } = await supabase
          .from('push_tokens')
          .select('token')
          .eq('user_id', userId)
          .eq('is_active', true)

        for (const t of tokens ?? []) {
          messages.push({
            to: t.token,
            sound: 'default',
            title: '📊 Haftalık Raporun Hazır',
            body: `${metrics.total_lessons} ders, ${metrics.total_minutes}dk — Kavra'nın değerlendirmesi`,
            data: { type: 'weekly_report', weekStart: weekStartStr },
          })
        }

        usersSucceeded++
      } catch (err) {
        usersFailed++
        logger.warn({ userId, err }, 'Weekly report hata')
      }
    }

    const { sent, errors } = await sendExpoPushBatch(messages)
    logger.info({ sent, errors }, 'Weekly report push gönderildi')

    await supabase
      .from('cron_job_runs')
      .update({
        finished_at: new Date().toISOString(),
        success: errors === 0,
        users_processed: usersProcessed,
        users_succeeded: usersSucceeded,
        users_failed: usersFailed,
      })
      .eq('id', jobRun?.id)
  } catch (err: any) {
    logger.error(err, 'Weekly report genel hata')
    await supabase
      .from('cron_job_runs')
      .update({
        finished_at: new Date().toISOString(),
        success: false,
        error_message: err.message,
        users_processed: usersProcessed,
        users_succeeded: usersSucceeded,
        users_failed: usersFailed,
      })
      .eq('id', jobRun?.id)
  }
}
