import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import Stripe from 'stripe'
import { z } from 'zod'
import { supabase, verifyUserToken } from '../supabase.js'

const stripeKey = process.env.STRIPE_SECRET_KEY
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET

const stripe = stripeKey ? new Stripe(stripeKey, { apiVersion: '2024-12-18.acacia' as any }) : null

const PRICE_IDS = {
  pro_monthly: process.env.STRIPE_PRICE_MONTHLY,
  pro_yearly: process.env.STRIPE_PRICE_YEARLY,
  pro_lifetime: process.env.STRIPE_PRICE_LIFETIME,
}

const CheckoutSchema = z.object({
  tier: z.enum(['pro_monthly', 'pro_yearly', 'pro_lifetime']),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
})

/**
 * Stripe subscription mantığı:
 * - "checkout/create" → Stripe Checkout session oluşturur, kullanıcıyı yönlendirir
 * - "webhook" → Stripe → bizim sunucu, subscription state değiştiğinde
 * - "portal" → Müşteri kendi aboneliğini Stripe portal'da yönetebilsin
 * - "entitlement" → mobile/web "ben Pro muyum?" diye sorar
 */
export async function subscriptionRoutes(fastify: FastifyInstance) {
  if (!stripe) {
    fastify.log.warn('[stripe] STRIPE_SECRET_KEY eksik — Pro endpointleri devre dışı')
  }

  // ============ ENTITLEMENT (her zaman çalışır) ============

  /** GET /api/me/entitlement — kullanıcı Pro mu? */
  fastify.get('/api/me/entitlement', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const { data } = await supabase
      .from('user_entitlements')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    return {
      isPro: data?.is_pro ?? false,
      tier: data?.tier ?? 'free',
      status: data?.status ?? 'active',
      currentPeriodEnd: data?.current_period_end,
      cancelAtPeriodEnd: data?.cancel_at_period_end ?? false,
    }
  })

  /** GET /api/pricing — gösterim için fiyat bilgileri */
  fastify.get('/api/pricing', async (_req, reply) => {
    if (!stripe) {
      return {
        plans: [
          { id: 'free', name: 'Free', price_cents: 0, features: ['150 teknik', 'Kendi Groq key'] },
          {
            id: 'pro_monthly',
            name: 'Pro Aylık',
            price_cents: 499,
            period: 'ay',
            features: ['Voice cloning', 'Sınırsız PDF', '7 kişilik', '3D map', 'Kaliteli TTS'],
          },
          {
            id: 'pro_yearly',
            name: 'Pro Yıllık',
            price_cents: 3900,
            period: 'yıl',
            features: ['Aylığa göre %35 indirim'],
          },
          {
            id: 'pro_lifetime',
            name: 'Lifetime',
            price_cents: 9900,
            period: 'tek seferlik',
            features: ['Ömür boyu Pro — early bird'],
          },
        ],
        earlyBirdRemaining: await getEarlyBirdRemaining(),
      }
    }

    // Stripe canlı fiyatları al
    const prices = await Promise.all(
      Object.entries(PRICE_IDS).map(async ([key, id]) => {
        if (!id) return null
        try {
          const price = await stripe.prices.retrieve(id, { expand: ['product'] })
          return {
            id: key,
            stripe_price_id: price.id,
            price_cents: price.unit_amount,
            currency: price.currency,
            interval: price.recurring?.interval ?? 'one_time',
            name: (price.product as Stripe.Product).name,
          }
        } catch {
          return null
        }
      }),
    )

    return {
      plans: prices.filter(Boolean),
      earlyBirdRemaining: await getEarlyBirdRemaining(),
    }
  })

  // ============ CHECKOUT ============

  if (stripe) {
    /** POST /api/stripe/checkout — Stripe Checkout oturumu oluştur */
    fastify.post('/api/stripe/checkout', async (req, reply) => {
      const userId = await verifyUserToken(req.headers.authorization)
      if (!userId) return reply.code(401).send({ error: 'unauthorized' })

      const parsed = CheckoutSchema.safeParse(req.body)
      if (!parsed.success) return reply.code(400).send({ error: parsed.error.format() })

      const priceId = PRICE_IDS[parsed.data.tier]
      if (!priceId) {
        return reply.code(400).send({ error: 'price_not_configured', tier: parsed.data.tier })
      }

      // Mevcut customer'ı bul veya oluştur
      const { data: existing } = await supabase
        .from('subscriptions')
        .select('stripe_customer_id')
        .eq('user_id', userId)
        .maybeSingle()

      let customerId = existing?.stripe_customer_id
      if (!customerId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('email, full_name')
          .eq('id', userId)
          .single()

        const customer = await stripe!.customers.create({
          email: profile?.email,
          name: profile?.full_name ?? undefined,
          metadata: { user_id: userId },
        })
        customerId = customer.id

        await supabase
          .from('subscriptions')
          .upsert({ user_id: userId, stripe_customer_id: customerId }, { onConflict: 'user_id' })
      }

      const isLifetime = parsed.data.tier === 'pro_lifetime'

      const session = await stripe!.checkout.sessions.create({
        customer: customerId,
        mode: isLifetime ? 'payment' : 'subscription',
        line_items: [{ price: priceId, quantity: 1 }],
        success_url:
          parsed.data.successUrl ?? 'https://kavra.app/success?sid={CHECKOUT_SESSION_ID}',
        cancel_url: parsed.data.cancelUrl ?? 'https://kavra.app/cancel',
        client_reference_id: userId,
        metadata: { user_id: userId, tier: parsed.data.tier },
        ...(isLifetime ? {} : { allow_promotion_codes: true }),
      })

      return { url: session.url, sessionId: session.id }
    })

    /** POST /api/stripe/portal — Stripe billing portal */
    fastify.post('/api/stripe/portal', async (req, reply) => {
      const userId = await verifyUserToken(req.headers.authorization)
      if (!userId) return reply.code(401).send({ error: 'unauthorized' })

      const { data: sub } = await supabase
        .from('subscriptions')
        .select('stripe_customer_id')
        .eq('user_id', userId)
        .single()

      if (!sub?.stripe_customer_id) {
        return reply.code(400).send({ error: 'no_customer' })
      }

      const session = await stripe!.billingPortal.sessions.create({
        customer: sub.stripe_customer_id,
        return_url: 'https://kavra.app/profile',
      })

      return { url: session.url }
    })

    // ============ WEBHOOK ============

    /**
     * POST /api/stripe/webhook — Stripe → bizim sunucu
     * Raw body lazım (signature verification için).
     */
    fastify.post(
      '/api/stripe/webhook',
      { config: { rawBody: true } },
      async (req: FastifyRequest, reply: FastifyReply) => {
        const sig = req.headers['stripe-signature'] as string
        const rawBody = (req as any).rawBody

        if (!stripeWebhookSecret) {
          fastify.log.error('STRIPE_WEBHOOK_SECRET eksik')
          return reply.code(500).send({ error: 'webhook_secret_missing' })
        }

        let event: Stripe.Event
        try {
          event = stripe!.webhooks.constructEvent(rawBody, sig, stripeWebhookSecret)
        } catch (err: any) {
          fastify.log.error({ err }, 'Webhook signature verification failed')
          return reply.code(400).send({ error: 'invalid_signature' })
        }

        try {
          await handleStripeEvent(event)
          return { received: true }
        } catch (err: any) {
          fastify.log.error({ err, eventType: event.type }, 'Webhook handler hata')
          return reply.code(500).send({ error: 'handler_failed' })
        }
      },
    )
  }
}

/**
 * Stripe event handler — subscription lifecycle olaylarını işler.
 * KRİTİK: idempotent olmalı. Stripe aynı event'i birden çok kez gönderebilir.
 */
async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const userId = session.client_reference_id || (session.metadata?.user_id as string)
      if (!userId) {
        console.warn('[stripe] checkout.completed: user_id yok', session.id)
        return
      }

      const tier = (session.metadata?.tier as string) ?? 'pro_monthly'

      if (session.mode === 'payment') {
        // Lifetime
        const earlyBirdNumber = await assignEarlyBirdNumber()
        await supabase.from('lifetime_purchases').insert({
          user_id: userId,
          stripe_payment_intent_id: session.payment_intent as string,
          amount_paid_cents: session.amount_total ?? 9900,
          currency: session.currency ?? 'usd',
          early_bird_number: earlyBirdNumber,
        })

        await supabase
          .from('subscriptions')
          .update({
            tier: 'pro_lifetime',
            status: 'active',
            stripe_customer_id: session.customer as string,
            lifetime_purchased_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId)
      } else if (session.subscription) {
        // Subscription başlangıcı — ayrıca subscription.created/updated event'i de gelecek
        const sub = await stripe!.subscriptions.retrieve(session.subscription as string)
        await syncSubscription(userId, sub, tier as any)
      }
      break
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      const userId = await findUserByCustomer(sub.customer as string)
      if (!userId) return

      const priceId = sub.items.data[0]?.price.id
      const tier = mapPriceToTier(priceId ?? '')
      await syncSubscription(userId, sub, tier)
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      const userId = await findUserByCustomer(sub.customer as string)
      if (!userId) return

      await supabase
        .from('subscriptions')
        .update({
          tier: 'free',
          status: 'canceled',
          canceled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      const userId = await findUserByCustomer(invoice.customer as string)
      if (!userId) return

      await supabase
        .from('subscriptions')
        .update({ status: 'past_due', updated_at: new Date().toISOString() })
        .eq('user_id', userId)
      break
    }

    default:
      // Diğer event'leri sessizce yoksay
      break
  }
}

async function syncSubscription(
  userId: string,
  sub: Stripe.Subscription,
  tier: 'pro_monthly' | 'pro_yearly' | 'free',
): Promise<void> {
  await supabase.from('subscriptions').upsert(
    {
      user_id: userId,
      stripe_customer_id: sub.customer as string,
      stripe_subscription_id: sub.id,
      stripe_price_id: sub.items.data[0]?.price.id ?? null,
      tier,
      status: sub.status,
      current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
      current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
      cancel_at_period_end: sub.cancel_at_period_end,
      canceled_at: sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null,
      trial_end: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  )
}

function mapPriceToTier(priceId: string): 'pro_monthly' | 'pro_yearly' | 'free' {
  if (priceId === PRICE_IDS.pro_monthly) return 'pro_monthly'
  if (priceId === PRICE_IDS.pro_yearly) return 'pro_yearly'
  return 'free'
}

async function findUserByCustomer(customerId: string): Promise<string | null> {
  const { data } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle()
  return data?.user_id ?? null
}

const EARLY_BIRD_LIMIT = 100

async function getEarlyBirdRemaining(): Promise<number> {
  const { count } = await supabase
    .from('lifetime_purchases')
    .select('*', { count: 'exact', head: true })
    .not('early_bird_number', 'is', null)
  return Math.max(0, EARLY_BIRD_LIMIT - (count ?? 0))
}

async function assignEarlyBirdNumber(): Promise<number | null> {
  const { count } = await supabase
    .from('lifetime_purchases')
    .select('*', { count: 'exact', head: true })
    .not('early_bird_number', 'is', null)
  const next = (count ?? 0) + 1
  return next <= EARLY_BIRD_LIMIT ? next : null
}
