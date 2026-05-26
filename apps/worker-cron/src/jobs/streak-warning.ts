import type { Logger } from 'pino'
import { sendExpoPushBatch, supabase } from '../supabase.js'

interface JobContext {
  logger: Logger
}

/**
 * Streak Warning
 * ==============
 *
 * Her gün 21:00 UTC. 3+ günlük streak'i olup bugün hiç aktivite yapmamış
 * kullanıcıları yakalar, "streak'in tehlikede" pushu gönderir.
 *
 * Kayıp aversiyonu (loss aversion) → kullanıcı kaybı yaşamaktan kaçınır,
 * uygulamaya geri döner.
 */
export async function runStreakWarning({ logger }: JobContext): Promise<void> {
  const { data: jobRun } = await supabase
    .from('cron_job_runs')
    .insert({ job_name: 'streak_warning' })
    .select()
    .single()

  let usersProcessed = 0
  let usersSucceeded = 0
  let usersFailed = 0

  try {
    const today = new Date().toISOString().slice(0, 10)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

    // 3+ streak'i olan ve son aktivitesi dün veya öncesi olan kullanıcılar
    const { data: candidates } = await supabase
      .from('streaks')
      .select('user_id, current_streak, last_activity_date')
      .gte('current_streak', 3)
      .lt('last_activity_date', today)

    if (!candidates || candidates.length === 0) {
      logger.info('Streak warning: aday yok')
      await finish(jobRun?.id, true, 0, 0, 0)
      return
    }

    // Notify on tercihi olanları filtrele
    const userIds = candidates.map((c: any) => c.user_id)
    const { data: prefs } = await supabase
      .from('user_preferences')
      .select('user_id, notify_streak_warning')
      .in('user_id', userIds)
      .eq('notify_streak_warning', true)

    const wantingSet = new Set((prefs ?? []).map((p: any) => p.user_id))
    const filtered = candidates.filter((c: any) => wantingSet.has(c.user_id))

    logger.info({ candidates: candidates.length, filtered: filtered.length }, 'Streak warning')

    const messages: Parameters<typeof sendExpoPushBatch>[0] = []

    for (const c of filtered) {
      usersProcessed++
      try {
        const { data: tokens } = await supabase
          .from('push_tokens')
          .select('token')
          .eq('user_id', c.user_id)
          .eq('is_active', true)

        for (const t of tokens ?? []) {
          messages.push({
            to: t.token,
            sound: 'default',
            title: '🔥 Serini koru!',
            body:
              c.current_streak === 1
                ? 'Bugün hiç çalışmadın'
                : `${c.current_streak} günlük serini bitirme — 5 dakikalık tek bir kart yeter`,
            data: { type: 'streak_warning', streak: c.current_streak },
          })
        }
        usersSucceeded++
      } catch (err) {
        usersFailed++
        logger.warn({ userId: c.user_id, err }, 'Streak warning hata')
      }
    }

    const { sent, errors } = await sendExpoPushBatch(messages)
    logger.info({ sent, errors }, 'Streak warning gönderim')

    await finish(jobRun?.id, errors === 0, usersProcessed, usersSucceeded, usersFailed)
  } catch (err: any) {
    logger.error(err, 'Streak warning genel hata')
    await finish(jobRun?.id, false, usersProcessed, usersSucceeded, usersFailed, err.message)
  }
}

async function finish(
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
