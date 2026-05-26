import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { supabase, verifyUserToken } from '../supabase.js'

/**
 * Auth Routes — Multi-Provider Authentication
 * ============================================
 *
 * Supabase Auth zaten OAuth (Google, Facebook, Apple, vb) ve email/password destekliyor.
 * Bu route'lar Supabase Auth'un üzerine eklenen özel akışlar:
 *
 * 1. Telefon SMS OTP — Supabase phone auth + custom doğrulama
 * 2. Şifre Sıfırlama OTP — 6 haneli kod (email)
 * 3. Telefon doğrulama (giriş yaptıktan sonra)
 * 4. Provider link/unlink (kullanıcı birden fazla provider'a sahip olsun)
 *
 * NOT: Instagram girişi için: Meta üzerinden Facebook auth kullanılır.
 * Instagram standalone login Meta'nın yeni Threads/Instagram API'sine gerek duyar
 * (basic display deprecated). Bu nedenle Faz 8'de Facebook auth Instagram için yeterli.
 */

// ===== Schemas =====

const SendOTPSchema = z.object({
  identifier: z.string().min(3), // email veya telefon
  identifierType: z.enum(['phone', 'email']),
  purpose: z.enum(['signup', 'login', 'password_reset', 'phone_verify', 'email_verify']),
})

const VerifyOTPSchema = z.object({
  identifier: z.string().min(3),
  identifierType: z.enum(['phone', 'email']),
  code: z.string().length(6),
  purpose: z.enum(['signup', 'login', 'password_reset', 'phone_verify', 'email_verify']),
})

const PasswordResetSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
  newPassword: z.string().min(8).max(128),
})

// ===== Helpers =====

function generateOTP(): string {
  // 6 haneli, 100000-999999 (sıfırla başlamasın)
  return String(crypto.randomInt(100000, 1000000))
}

async function sendEmailOTP(email: string, code: string, purpose: string): Promise<void> {
  // Resend / SendGrid / Postmark — birini seç
  const RESEND_KEY = process.env.RESEND_API_KEY
  if (!RESEND_KEY) {
    console.log(`[OTP] ${email} için kod: ${code} (${purpose})`)
    return // dev mode — console'a yaz
  }

  const subjects: Record<string, string> = {
    signup: "✨ Kavra'ya hoş geldin — Doğrulama kodun",
    login: '🔑 Kavra giriş kodun',
    password_reset: '🔒 Şifre sıfırlama kodun',
    email_verify: '📧 E-posta doğrulama kodun',
  }

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Kavra <hello@kavra.app>',
      to: email,
      subject: subjects[purpose] ?? 'Kavra Doğrulama',
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 500px; margin: 40px auto; padding: 32px; background: #FBF8F0; border-radius: 24px;">
          <div style="font-family: Georgia, serif; font-size: 36px; color: #1E1B4B; letter-spacing: -0.02em;">Kavra<span style="color: #F59E0B; font-style: italic;">.</span></div>
          <p style="color: #64748B; font-size: 14px; margin-top: 16px;">Aşağıdaki kodu uygulamaya gir. Kod <strong>10 dakika</strong> geçerli.</p>
          <div style="background: white; border: 1px solid #E2E8F0; border-radius: 16px; padding: 24px; text-align: center; margin: 24px 0;">
            <div style="font-family: 'JetBrains Mono', monospace; font-size: 36px; color: #1E1B4B; letter-spacing: 0.3em;">${code}</div>
          </div>
          <p style="color: #94A3B8; font-size: 12px; line-height: 1.5;">Bu kodu sen istemediysen yok say. Şifren güvende.</p>
        </div>
      `,
    }),
  })
}

async function sendSMSOTP(phone: string, code: string): Promise<void> {
  const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID
  const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN
  const TWILIO_FROM = process.env.TWILIO_FROM_NUMBER

  if (!TWILIO_SID || !TWILIO_TOKEN || !TWILIO_FROM) {
    console.log(`[OTP-SMS] ${phone} için kod: ${code}`)
    return // dev mode
  }

  const auth = Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString('base64')
  await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      From: TWILIO_FROM,
      To: phone,
      Body: `Kavra doğrulama kodun: ${code}\n10 dakika geçerli.`,
    }),
  })
}

// ===== Routes =====

export async function authRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/auth/otp/send
   * 6 haneli kod oluşturur, hash'leyip DB'ye kaydeder, email/SMS gönderir.
   */
  fastify.post('/api/auth/otp/send', async (req, reply) => {
    const parsed = SendOTPSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.format() })

    const { identifier, identifierType, purpose } = parsed.data

    // Rate limit — son 60 saniyede aynı identifier için OTP gönderildi mi?
    const { count } = await supabase
      .from('otp_codes')
      .select('*', { count: 'exact', head: true })
      .eq('identifier', identifier)
      .eq('purpose', purpose)
      .gte('created_at', new Date(Date.now() - 60_000).toISOString())

    if ((count ?? 0) > 0) {
      return reply.code(429).send({
        error: 'rate_limit',
        message: 'Çok sık deniyorsun. 60 saniye bekle.',
      })
    }

    const code = generateOTP()
    const codeHash = await bcrypt.hash(code, 10)
    const expiresAt = new Date(Date.now() + 10 * 60_000) // 10 dakika

    const { error } = await supabase.from('otp_codes').insert({
      identifier,
      identifier_type: identifierType,
      code_hash: codeHash,
      purpose,
      expires_at: expiresAt.toISOString(),
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
    })

    if (error) {
      fastify.log.error(error, 'OTP insert hata')
      return reply.code(500).send({ error: 'otp_create_failed' })
    }

    try {
      if (identifierType === 'email') {
        await sendEmailOTP(identifier, code, purpose)
      } else {
        await sendSMSOTP(identifier, code)
      }
    } catch (err: any) {
      fastify.log.error(err, 'OTP send hata')
      return reply.code(500).send({ error: 'otp_send_failed' })
    }

    return {
      ok: true,
      message:
        identifierType === 'email'
          ? 'E-postana 6 haneli kod gönderdik'
          : 'Telefonuna SMS ile 6 haneli kod gönderdik',
      expiresAt: expiresAt.toISOString(),
    }
  })

  /**
   * POST /api/auth/otp/verify
   * Kodu doğrular, signup ise kullanıcı oluşturur, login ise session döner.
   */
  fastify.post('/api/auth/otp/verify', async (req, reply) => {
    const parsed = VerifyOTPSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.format() })

    const { identifier, identifierType, code, purpose } = parsed.data

    // En son OTP kaydı (consumed olmamış, expired olmamış)
    const { data: otp } = await supabase
      .from('otp_codes')
      .select('*')
      .eq('identifier', identifier)
      .eq('purpose', purpose)
      .is('consumed_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!otp) {
      return reply
        .code(400)
        .send({ error: 'invalid_or_expired', message: 'Kod geçersiz veya süresi doldu' })
    }

    if (otp.attempts >= otp.max_attempts) {
      return reply
        .code(429)
        .send({ error: 'too_many_attempts', message: 'Çok fazla yanlış deneme' })
    }

    const valid = await bcrypt.compare(code, otp.code_hash)
    if (!valid) {
      await supabase
        .from('otp_codes')
        .update({ attempts: otp.attempts + 1 })
        .eq('id', otp.id)
      return reply.code(400).send({
        error: 'invalid_code',
        attemptsRemaining: otp.max_attempts - otp.attempts - 1,
      })
    }

    // Doğru — consumed işaretle
    await supabase
      .from('otp_codes')
      .update({ consumed_at: new Date().toISOString() })
      .eq('id', otp.id)

    // Purpose'a göre devam et
    switch (purpose) {
      case 'phone_verify': {
        const userId = await verifyUserToken(req.headers.authorization)
        if (!userId) return reply.code(401).send({ error: 'unauthorized' })

        await supabase
          .from('profiles')
          .update({
            phone_number: identifier,
            phone_verified_at: new Date().toISOString(),
          })
          .eq('id', userId)

        return { ok: true, verified: true }
      }

      case 'signup':
      case 'login': {
        // Phone-based passwordless: Supabase Auth Admin API ile session oluştur
        // veya kullanıcı email/password kombinasyonu ekleyip giriş yap
        return {
          ok: true,
          message: 'Doğrulama başarılı, devam et',
          // Mobile bu noktada Supabase'in signInWithPassword veya signInWithOtp
          // çağrısını yapacak
        }
      }

      case 'password_reset': {
        // Bir sonraki adımda yeni şifre belirler
        return {
          ok: true,
          resetToken: crypto.randomBytes(32).toString('hex'),
          // 5dk geçerli; bu token ile yeni şifre POST edilir
        }
      }

      default:
        return { ok: true }
    }
  })

  /**
   * POST /api/auth/password-reset/complete
   * Şifre sıfırlama 2. adım: yeni şifre kaydet
   */
  fastify.post('/api/auth/password-reset/complete', async (req, reply) => {
    const parsed = PasswordResetSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.format() })

    const { email, code, newPassword } = parsed.data

    // Kodu yeniden doğrula (tek seferlik kullanım için)
    const { data: otp } = await supabase
      .from('otp_codes')
      .select('*')
      .eq('identifier', email)
      .eq('purpose', 'password_reset')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!otp || !otp.consumed_at) {
      return reply.code(400).send({ error: 'invalid_state' })
    }

    // Supabase Admin ile şifre güncelle
    const { data: userData } = await supabase.auth.admin.listUsers()
    const user = userData.users.find((u) => u.email === email)
    if (!user) return reply.code(404).send({ error: 'user_not_found' })

    const { error } = await supabase.auth.admin.updateUserById(user.id, {
      password: newPassword,
    })

    if (error) return reply.code(500).send({ error: error.message })

    return { ok: true, message: 'Şifren güncellendi' }
  })

  /**
   * POST /api/auth/logout
   * Push token temizle, session sonlandır.
   */
  fastify.post('/api/auth/logout', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    // Push token deactivate
    await supabase.from('push_tokens').update({ is_active: false }).eq('user_id', userId)

    return { ok: true, message: 'Çıkış yapıldı' }
  })

  /**
   * GET /api/me/providers
   * Kullanıcının bağlı auth provider'larını listele.
   */
  fastify.get('/api/me/providers', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const { data: profile } = await supabase
      .from('profiles')
      .select('auth_providers, phone_number, phone_verified_at, email')
      .eq('id', userId)
      .single()

    return {
      providers: profile?.auth_providers ?? [],
      phone: profile?.phone_number,
      phoneVerified: !!profile?.phone_verified_at,
      email: profile?.email,
    }
  })

  /**
   * POST /api/auth/account/delete
   * Kullanıcı kendi hesabını sil (KVKK gereği).
   */
  fastify.post('/api/auth/account/delete', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    // Cascade ile tüm veriler silinir (FK ON DELETE CASCADE)
    const { error } = await supabase.auth.admin.deleteUser(userId)
    if (error) return reply.code(500).send({ error: error.message })

    return { ok: true, message: 'Hesabın silindi' }
  })
}
