import type { Logger } from 'pino'
import { sendExpoPushBatch, supabase } from '../supabase.js'

interface JobContext {
  logger: Logger
}

/**
 * Daily Review Reminder
 * =====================
 *
 * Her saat başı çalışır. Şu an UTC saatine bakar, kullanıcının tercih ettiği
 * lokal saat (`notify_review_reminder_hour`, default 20) bu UTC saatine denk
 * geliyorsa o kullanıcıya "X kart hazır" pushu gönderir.
 *
 * Kullanıcı timezone'ı şu an profiles'da yok; basitleştirme: tüm kullanıcılar
 * aynı UTC saatinde alıyor (default 20:00 UTC). Faz 8'de timezone alanı eklenecek.
 *
 * Kontroller:
 * - notify_review_reminder = true
 * - en az 1 due flashcard var
 * - aktif push token var
 * - bu gün için zaten gönderilmedi (cron_job_runs ile dedup)
 */
export async function runDailyReviewReminder({ logger }: JobContext): Promise<void> {
  const startedAt = new Date()
  const currentHourUTC = startedAt.getUTCHours()

  // Cron job log başlat
  const { data: jobRun } = await supabase
    .from('cron_job_runs')
    .insert({
      job_name: 'daily_review_reminder',
      metadata: { hour_utc: currentHourUTC },
    })
    .select()
    .single()

  let usersProcessed = 0
  let usersSucceeded = 0
  let usersFailed = 0

  try {
    // Bu saatte bildirim isteyenleri al
    const { data: prefs } = await supabase
      .from('user_preferences')
      .select('user_id, notify_review_reminder, notify_review_reminder_hour')
      .eq('notify_review_reminder', true)
      .eq('notify_review_reminder_hour', currentHourUTC)

    if (!prefs || prefs.length === 0) {
      logger.info({ currentHourUTC }, 'Bu saat için kullanıcı yok')
      await finishJob(jobRun?.id, true, 0, 0, 0)
      return
    }

    logger.info({ count: prefs.length, currentHourUTC }, 'Reminder gönderim başlıyor')

    const messages: Parameters<typeof sendExpoPushBatch>[0] = []

    for (const pref of prefs) {
      usersProcessed++
      try {
        // Due cards var mı?
        const { data: dueCards } = await supabase.rpc('get_due_flashcards', {
          match_user_id: pref.user_id,
          match_subject_id: null,
          match_limit: 1000,
        })

        const dueCount = (dueCards ?? []).length
        if (dueCount === 0) continue

        // Aktif token'ları al
        const { data: tokens } = await supabase
          .from('push_tokens')
          .select('token')
          .eq('user_id', pref.user_id)
          .eq('is_active', true)

        if (!tokens || tokens.length === 0) continue

        for (const t of tokens) {
          messages.push({
            to: t.token,
            sound: 'default',
            title: '🔁 Tekrar zamanı',
            body: dueCount === 1 ? '1 kart seni bekliyor' : `${dueCount} kart seni bekliyor`,
            data: { type: 'review_reminder', dueCount, userId: pref.user_id },
          })
        }
        usersSucceeded++
      } catch (err) {
        usersFailed++
        logger.warn({ userId: pref.user_id, err }, 'Reminder hata')
      }
    }

    // Toplu gönder
    const { sent, errors } = await sendExpoPushBatch(messages)
    logger.info({ sent, errors, usersSucceeded, usersFailed }, 'Reminder tamamlandı')

    await finishJob(jobRun?.id, errors === 0, usersProcessed, usersSucceeded, usersFailed)
  } catch (err: any) {
    logger.error(err, 'Daily reminder genel hata')
    await finishJob(jobRun?.id, false, usersProcessed, usersSucceeded, usersFailed, err.message)
  }
}

async function finishJob(
  id: string | undefined,
  success: boolean,
  processed: number,
  succeeded: number,
  failed: number,
  errorMessage?: string,
): Promise<void> {
  if (!id) return
  await supabase
    .from('cron_job_runs')
    .update({
      finished_at: new Date().toISOString(),
      success,
      users_processed: processed,
      users_succeeded: succeeded,
      users_failed: failed,
      error_message: errorMessage ?? null,
    })
    .eq('id', id)
}
