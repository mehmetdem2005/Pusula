import { createServiceClient } from '@kavra/db'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  throw new Error('Cron worker: Supabase env değişkenleri eksik')
}

export const supabase = createServiceClient(url, serviceKey)

/** Expo Push API'ye batch gönderim */
export async function sendExpoPushBatch(
  messages: Array<{
    to: string
    title: string
    body: string
    data?: Record<string, unknown>
    sound?: string
  }>,
): Promise<{ sent: number; errors: number }> {
  if (messages.length === 0) return { sent: 0, errors: 0 }

  // Expo limit: 100 push/request
  const BATCH = 100
  let sent = 0
  let errors = 0

  for (let i = 0; i < messages.length; i += BATCH) {
    const batch = messages.slice(i, i + BATCH)
    try {
      const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
        },
        body: JSON.stringify(batch),
      })
      if (res.ok) sent += batch.length
      else errors += batch.length
    } catch {
      errors += batch.length
    }
  }

  return { sent, errors }
}
