import 'dotenv/config'
import cron from 'node-cron'
import pino from 'pino'
import { runDailyReviewReminder } from './jobs/daily-review-reminder.js'
import { runStreakWarning } from './jobs/streak-warning.js'
import { runWeeklyReportGeneration } from './jobs/weekly-report-generation.js'

const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  transport: process.env.NODE_ENV !== 'production' ? { target: 'pino-pretty' } : undefined,
})

/**
 * Kavra Cron Worker
 *
 * 3 schedule:
 *   1. Her saat başı, kullanıcı timezone'ına göre review reminder kontrol
 *   2. Her pazartesi 09:00 UTC, geçen haftanın AI raporu üretim
 *   3. Her gün 21:00 UTC, "streak'in tehlikede" uyarısı
 *
 * Render.com'da `type: cron` ile deploy edilirken bir kerelik tetikleme;
 * yerel `pnpm dev` ya da Railway gibi her zaman çalışan bir env'de schedule.
 *
 * RUN_MODE env:
 *   - "scheduled" (default) → node-cron ile sürekli ayakta dur
 *   - "once-<job>" → tek seferlik çalıştır, sonra exit (Render Cron Job için)
 */

const RUN_MODE = process.env.RUN_MODE ?? 'scheduled'

logger.info({ mode: RUN_MODE }, 'Kavra cron worker başlıyor')

if (RUN_MODE === 'scheduled') {
  // Her saat başı (timezone-aware review reminder kontrol)
  cron.schedule('0 * * * *', async () => {
    logger.info('[scheduled] daily-review-reminder hourly check')
    try {
      await runDailyReviewReminder({ logger })
    } catch (err) {
      logger.error(err, 'daily-review-reminder failed')
    }
  })

  // Pazartesi 09:00 UTC — haftalık raporu üret
  cron.schedule('0 9 * * 1', async () => {
    logger.info('[scheduled] weekly-report-generation')
    try {
      await runWeeklyReportGeneration({ logger })
    } catch (err) {
      logger.error(err, 'weekly-report-generation failed')
    }
  })

  // Her gün 21:00 UTC — streak warning
  cron.schedule('0 21 * * *', async () => {
    logger.info('[scheduled] streak-warning')
    try {
      await runStreakWarning({ logger })
    } catch (err) {
      logger.error(err, 'streak-warning failed')
    }
  })

  logger.info('Schedule kuruldu, ayakta bekleniyor')

  // Container'ı diri tut
  process.on('SIGINT', () => process.exit(0))
  process.on('SIGTERM', () => process.exit(0))
} else if (RUN_MODE.startsWith('once-')) {
  const jobName = RUN_MODE.slice(5)
  logger.info({ jobName }, 'Tek seferlik çalışma')

  const runner = {
    'daily-review-reminder': runDailyReviewReminder,
    'weekly-report-generation': runWeeklyReportGeneration,
    'streak-warning': runStreakWarning,
  }[jobName]

  if (!runner) {
    logger.error({ jobName }, 'Bilinmeyen job')
    process.exit(1)
  }

  await runner({ logger })
  logger.info('Job tamamlandı, exit')
  process.exit(0)
} else {
  logger.error({ mode: RUN_MODE }, 'Geçersiz RUN_MODE')
  process.exit(1)
}
