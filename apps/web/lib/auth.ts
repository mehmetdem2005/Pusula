import { getSupabaseBrowser } from './supabase';

/**
 * Client-side auth yardımcıları — tüm giriş/kayıt/hesap akışları burada toplanır.
 * Browser Supabase client kullanır; OAuth/e-posta redirect'leri /auth/callback'e gider.
 */

export type OAuthProvider = 'google' | 'facebook';

/**
 * Open-redirect koruması: yalnız uygulama-içi göreli path'lere izin ver.
 * `//evil.com`, `https://...`, boş gibi değerler /dashboard'a düşer.
 */
export function safeNext(next: string | null | undefined): string {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return '/dashboard';
  return next;
}

/** Supabase hata mesajlarını anlaşılır Türkçeye çevir. */
export function friendlyAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login') || m.includes('invalid credentials'))
    return 'E-posta veya şifre hatalı.';
  if (m.includes('email not confirmed')) return 'E-postanı henüz doğrulamadın.';
  if (m.includes('user already registered') || m.includes('already been registered'))
    return 'Bu e-posta zaten kayıtlı. Giriş yapmayı dene.';
  if (m.includes('rate limit') || m.includes('too many'))
    return 'Çok fazla deneme. Lütfen biraz sonra tekrar dene.';
  if (m.includes('provider is not enabled') || m.includes('provider_disabled'))
    return 'Bu giriş yöntemi henüz aktif değil.';
  if (m.includes('password should be') || m.includes('at least'))
    return 'Şifre en az 8 karakter olmalı.';
  if (m.includes('invalid phone') || m.includes('phone'))
    return 'Telefon numarası geçersiz. +90 ile tam formatta gir.';
  return message;
}

const callbackUrl = (next = '/dashboard'): string =>
  `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

export function signInPassword(email: string, password: string) {
  return getSupabaseBrowser().auth.signInWithPassword({ email, password });
}

export function signUpPassword(
  email: string,
  password: string,
  meta: { display_name?: string; role?: string },
) {
  return getSupabaseBrowser().auth.signUp({
    email,
    password,
    options: { data: meta, emailRedirectTo: callbackUrl() },
  });
}

export function signInMagicLink(email: string) {
  return getSupabaseBrowser().auth.signInWithOtp({
    email,
    options: { emailRedirectTo: callbackUrl() },
  });
}

export function signInOAuth(provider: OAuthProvider) {
  return getSupabaseBrowser().auth.signInWithOAuth({
    provider,
    options: { redirectTo: callbackUrl() },
  });
}

export function sendPhoneOtp(phone: string) {
  return getSupabaseBrowser().auth.signInWithOtp({ phone });
}

export function verifyPhoneOtp(phone: string, token: string) {
  return getSupabaseBrowser().auth.verifyOtp({ phone, token, type: 'sms' });
}

export function sendPasswordReset(email: string) {
  return getSupabaseBrowser().auth.resetPasswordForEmail(email, {
    redirectTo: callbackUrl('/auth/reset-password'),
  });
}

export function updatePassword(password: string) {
  return getSupabaseBrowser().auth.updateUser({ password });
}

/** Giriş/güvenlik olayını auth_audit_log'a yaz (best-effort, hata yutulur). */
export async function logAudit(event: string, meta: Record<string, unknown> = {}): Promise<void> {
  try {
    const sb = getSupabaseBrowser();
    const { data } = await sb.auth.getUser();
    if (!data.user) return;
    const provider = (data.user.app_metadata as { provider?: string }).provider ?? null;
    await sb.from('auth_audit_log').insert({
      user_id: data.user.id,
      event,
      provider,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 300) : null,
      meta,
    });
  } catch {
    // audit best-effort
  }
}
