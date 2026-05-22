import { getSupabaseBrowser } from './supabase';

/**
 * Client-side auth yardımcıları — tüm giriş/kayıt/hesap akışları burada toplanır.
 * Browser Supabase client kullanır; OAuth/e-posta redirect'leri /auth/callback'e gider.
 */

export type OAuthProvider = 'google' | 'facebook';

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
