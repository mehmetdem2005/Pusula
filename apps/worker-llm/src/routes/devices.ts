import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { supabase, verifyUserToken } from '../supabase.js'

/**
 * Devices Routes — multi-device sync + push notifications
 * =========================================================
 *
 * Akış:
 *   1. Mobil app start → POST /api/devices/register
 *   2. Push notif gönderim → POST /api/devices/push (admin/internal)
 *   3. Kullanıcı cihazlarını görüntüle → GET /api/devices
 *   4. Cihaz çıkar → DELETE /api/devices/:id
 *
 * Expo Push Notification Service kullanıyoruz:
 *   https://exp.host/--/api/v2/push/send
 */

const RegisterDeviceSchema = z.object({
  deviceId: z.string().min(1).max(200),
  deviceName: z.string().max(100).optional(),
  platform: z.enum(['ios', 'android', 'web']),
  appVersion: z.string().max(20).optional(),
  osVersion: z.string().max(20).optional(),
  pushToken: z.string().max(200).optional(),
  pushEnabled: z.boolean().default(true),
})

const SendPushSchema = z.object({
  userIds: z.array(z.string().uuid()).max(1000),
  title: z.string().max(100),
  body: z.string().max(500),
  data: z.record(z.string(), z.any()).optional(),
  channelId: z.string().optional(), // Android channel
  sound: z.enum(['default', 'none']).optional().default('default'),
  badge: z.number().int().optional(),
  priority: z.enum(['default', 'normal', 'high']).optional().default('default'),
})

interface ExpoPushMessage {
  to: string
  title: string
  body: string
  data?: any
  sound?: 'default' | null
  channelId?: string
  badge?: number
  priority?: 'default' | 'normal' | 'high'
}

async function sendExpoPush(messages: ExpoPushMessage[]): Promise<any> {
  // Expo limit: 100 message per batch
  const results: any[] = []
  for (let i = 0; i < messages.length; i += 100) {
    const batch = messages.slice(i, i + 100)
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(batch),
    })
    if (!res.ok) throw new Error(`Expo Push: ${res.status} ${await res.text()}`)
    const data = await res.json()
    results.push(data)
  }
  return results
}

export async function devicesRoutes(fastify: FastifyInstance) {
  /** POST /api/devices/register */
  fastify.post('/api/devices/register', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const parsed = RegisterDeviceSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.format() })

    // Upsert (deviceId unique per user)
    const { data, error } = await supabase
      .from('user_devices')
      .upsert(
        {
          user_id: userId,
          device_id: parsed.data.deviceId,
          device_name: parsed.data.deviceName,
          platform: parsed.data.platform,
          app_version: parsed.data.appVersion,
          os_version: parsed.data.osVersion,
          push_token: parsed.data.pushToken,
          push_enabled: parsed.data.pushEnabled,
          last_active_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,device_id' },
      )
      .select()
      .single()

    if (error) return reply.code(500).send({ error: error.message })
    return { device: data }
  })

  /** GET /api/devices */
  fastify.get('/api/devices', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const { data } = await supabase
      .from('user_devices')
      .select(
        'id, device_name, platform, app_version, os_version, push_enabled, last_active_at, created_at',
      )
      .eq('user_id', userId)
      .order('last_active_at', { ascending: false })

    return { devices: data ?? [] }
  })

  /** PATCH /api/devices/:id (push toggle) */
  fastify.patch<{ Params: { id: string }; Body: { pushEnabled?: boolean } }>(
    '/api/devices/:id',
    async (req, reply) => {
      const userId = await verifyUserToken(req.headers.authorization)
      if (!userId) return reply.code(401).send({ error: 'unauthorized' })

      const { error } = await supabase
        .from('user_devices')
        .update({ push_enabled: req.body.pushEnabled })
        .eq('id', req.params.id)
        .eq('user_id', userId)

      if (error) return reply.code(500).send({ error: error.message })
      return { ok: true }
    },
  )

  /** DELETE /api/devices/:id */
  fastify.delete<{ Params: { id: string } }>('/api/devices/:id', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    await supabase.from('user_devices').delete().eq('id', req.params.id).eq('user_id', userId)

    return { ok: true }
  })

  /** POST /api/devices/push (admin/internal — toplu bildirim) */
  fastify.post('/api/devices/push', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    // Admin kontrol
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
      return reply.code(403).send({ error: 'admin_only' })
    }

    const parsed = SendPushSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.format() })

    // Gönderilecek tokenları topla
    const { data: devices } = await supabase
      .from('user_devices')
      .select('push_token')
      .in('user_id', parsed.data.userIds)
      .eq('push_enabled', true)
      .not('push_token', 'is', null)

    const tokens = (devices ?? []).map((d) => d.push_token).filter(Boolean) as string[]

    if (tokens.length === 0) {
      return { sent: 0, errors: ['no_push_tokens'] }
    }

    const messages: ExpoPushMessage[] = tokens.map((t) => ({
      to: t,
      title: parsed.data.title,
      body: parsed.data.body,
      data: parsed.data.data,
      sound: parsed.data.sound === 'none' ? null : 'default',
      channelId: parsed.data.channelId,
      badge: parsed.data.badge,
      priority: parsed.data.priority,
    }))

    try {
      const results = await sendExpoPush(messages)
      return { sent: tokens.length, results }
    } catch (e: any) {
      return reply.code(500).send({ error: e.message })
    }
  })
}
