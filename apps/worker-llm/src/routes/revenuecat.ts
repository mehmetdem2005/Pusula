import crypto from 'crypto'
import type { FastifyInstance } from 'fastify'
import { supabase } from '../supabase.js'

/**
 * RevenueCat Webhook
 * ===================
 *
 * iOS App Store + Google Play Store satışlarını RevenueCat üzerinden takip ediyoruz.
 * RevenueCat webhook'u user_entitlements'i otomatik günceller.
 *
 * Stripe (web) zaten subscription.ts'te. Bu route mobil-only.
 *
 * Setup:
 *   1. RevenueCat Dashboard → Project Settings → Webhooks
 *   2. URL: https://api.kavra.app/api/revenuecat/webhook
 *   3. Authorization header: REVENUECAT_WEBHOOK_AUTH
 *
 * Event types:
 *   - INITIAL_PURCHASE
 *   - RENEWAL
 *   - CANCELLATION
 *   - UNCANCELLATION
 *   - NON_RENEWING_PURCHASE (lifetime)
 *   - SUBSCRIPTION_PAUSED
 *   - EXPIRATION
 *   - BILLING_ISSUE
 *   - PRODUCT_CHANGE
 *   - TRANSFER
 *   - SUBSCRIBER_ALIAS (user_id mapping)
 */

const REVENUECAT_WEBHOOK_AUTH = process.env.REVENUECAT_WEBHOOK_AUTH

interface RevenueCatEvent {
  api_version: string
  event: {
    type: string
    id: string
    event_timestamp_ms: number
    app_user_id: string // Kavra user_id
    aliases?: string[]
    original_app_user_id?: string

    product_id: string // 'kavra_pro_monthly'
    period_type?: 'NORMAL' | 'TRIAL' | 'INTRO'
    purchased_at_ms?: number
    expiration_at_ms?: number | null
    auto_resume_at_ms?: number | null
    store: 'APP_STORE' | 'PLAY_STORE' | 'STRIPE' | 'PROMOTIONAL'
    environment: 'SANDBOX' | 'PRODUCTION'

    is_family_share?: boolean
    country_code?: string
    currency?: string
    price?: number
    price_in_purchased_currency?: number

    transaction_id?: string
    original_transaction_id?: string

    cancel_reason?: string // CUSTOMER_SUPPORT, BILLING_ERROR, etc.
    expiration_reason?: string

    entitlement_id?: string
    entitlement_ids?: string[]
  }
}

const PRODUCT_TO_TIER: Record<string, { tier: string; durationDays: number }> = {
  kavra_pro_monthly: { tier: 'pro', durationDays: 31 },
  kavra_pro_yearly: { tier: 'pro', durationDays: 366 },
  kavra_pro_lifetime: { tier: 'pro', durationDays: 36500 },
  // App Store ve Play Store farklı id kullanırsa
  'app.kavra.pro.monthly': { tier: 'pro', durationDays: 31 },
  'app.kavra.pro.yearly': { tier: 'pro', durationDays: 366 },
}

function verifyAuthHeader(header: string | undefined): boolean {
  if (!REVENUECAT_WEBHOOK_AUTH) return false
  return header === `Bearer ${REVENUECAT_WEBHOOK_AUTH}`
}

export async function revenueCatRoutes(fastify: FastifyInstance) {
  /** POST /api/revenuecat/webhook */
  fastify.post<{ Body: RevenueCatEvent }>('/api/revenuecat/webhook', async (req, reply) => {
    // Auth
    if (!verifyAuthHeader(req.headers.authorization)) {
      return reply.code(401).send({ error: 'unauthorized' })
    }

    const evt = req.body?.event
    if (!evt) return reply.code(400).send({ error: 'missing_event' })

    fastify.log.info({ type: evt.type, userId: evt.app_user_id }, 'RevenueCat webhook')

    const userId = evt.app_user_id
    const productInfo = PRODUCT_TO_TIER[evt.product_id]

    if (!productInfo) {
      fastify.log.warn(`Unknown product_id: ${evt.product_id}`)
      return { ok: true, ignored: true }
    }

    try {
      switch (evt.type) {
        case 'INITIAL_PURCHASE':
        case 'RENEWAL':
        case 'UNCANCELLATION':
        case 'PRODUCT_CHANGE':
        case 'NON_RENEWING_PURCHASE': {
          const validUntil = evt.expiration_at_ms
            ? new Date(evt.expiration_at_ms).toISOString()
            : new Date(Date.now() + productInfo.durationDays * 24 * 60 * 60 * 1000).toISOString()

          await supabase.from('user_entitlements').upsert(
            {
              user_id: userId,
              tier: productInfo.tier,
              is_pro: true,
              valid_until: validUntil,
              source:
                evt.store === 'APP_STORE'
                  ? 'app_store'
                  : evt.store === 'PLAY_STORE'
                    ? 'play_store'
                    : 'revenuecat',
              external_subscription_id: evt.original_transaction_id ?? evt.transaction_id,
              metadata: {
                period_type: evt.period_type,
                product_id: evt.product_id,
                country_code: evt.country_code,
                currency: evt.currency,
                price: evt.price,
              },
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id' },
          )

          break
        }

        case 'CANCELLATION': {
          // Subscription will continue until expiration_at_ms
          // Sadece cancel'i kaydet, valid_until'i değiştirme
          await supabase
            .from('user_entitlements')
            .update({
              metadata: {
                cancelled_at: new Date(evt.event_timestamp_ms).toISOString(),
                cancel_reason: evt.cancel_reason,
                will_renew: false,
              },
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', userId)

          break
        }

        case 'EXPIRATION':
        case 'BILLING_ISSUE': {
          // Pro'yu kapat
          await supabase
            .from('user_entitlements')
            .update({
              is_pro: false,
              tier: 'free',
              metadata: {
                expired_at: new Date(evt.event_timestamp_ms).toISOString(),
                expiration_reason: evt.expiration_reason ?? evt.type,
              },
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', userId)

          break
        }

        case 'SUBSCRIPTION_PAUSED': {
          await supabase
            .from('user_entitlements')
            .update({
              metadata: {
                paused_at: new Date(evt.event_timestamp_ms).toISOString(),
                resume_at: evt.auto_resume_at_ms
                  ? new Date(evt.auto_resume_at_ms).toISOString()
                  : null,
              },
            })
            .eq('user_id', userId)
          break
        }

        case 'TRANSFER':
        case 'SUBSCRIBER_ALIAS': {
          // Alias mapping — RevenueCat user_id değiştirmiş, eskiden yenisine taşı
          fastify.log.info({ from: evt.original_app_user_id, to: userId }, 'User alias')
          break
        }

        default:
          fastify.log.info(`Unhandled event type: ${evt.type}`)
      }

      // Log to audit table
      await Promise.resolve(
        supabase.from('subscription_events').insert({
          user_id: userId,
          event_type: evt.type,
          provider: 'revenuecat',
          external_id: evt.id,
          product_id: evt.product_id,
          store: evt.store,
          metadata: evt,
        }),
      )
        .then(() => {})
        .catch(() => {}) // best-effort

      return { ok: true }
    } catch (err: any) {
      fastify.log.error(err, 'RevenueCat webhook hata')
      return reply.code(500).send({ error: err.message })
    }
  })

  /** POST /api/revenuecat/restore — kullanıcı "Satın Alımları Geri Yükle" der */
  fastify.post<{ Body: { appUserId: string } }>('/api/revenuecat/restore', async (req, reply) => {
    // Bu mobil tarafından Purchases.restorePurchases() çağrısı sonrası
    // RevenueCat dashboard'dan en güncel entitlement çekilir.
    // Ama backend tarafında ek bir validasyona gerek yok — webhook'lar zaten handle eder.
    return { ok: true, message: 'Restore RevenueCat üzerinden çalışır.' }
  })
}
