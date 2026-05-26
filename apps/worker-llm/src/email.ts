/**
 * Basit transactional e-posta gönderimi (Resend).
 * RESEND_API_KEY yoksa dev modunda console'a log'lar (hata atmaz).
 */
export async function sendEmail(opts: {
  to: string | string[]
  subject: string
  html: string
}): Promise<boolean> {
  const RESEND_KEY = process.env.RESEND_API_KEY
  if (!RESEND_KEY) {
    console.log(`[EMAIL] to=${opts.to} subject="${opts.subject}" (RESEND_API_KEY yok, atlandı)`)
    return false
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Kavra <hello@kavra.app>',
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
      }),
    })
    return res.ok
  } catch (err) {
    console.error('[EMAIL] gönderim hatası', err)
    return false
  }
}

/** Kavra markalı e-posta gövdesi sarmalayıcı. */
export function emailLayout(bodyHtml: string): string {
  return `
    <div style="font-family: -apple-system, sans-serif; max-width: 520px; margin: 40px auto; padding: 32px; background: #FBF8F0; border-radius: 24px;">
      <div style="font-family: Georgia, serif; font-size: 32px; color: #1E1B4B; letter-spacing: -0.02em;">Kavra<span style="color: #F59E0B; font-style: italic;">.</span></div>
      ${bodyHtml}
    </div>
  `
}
