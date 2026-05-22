'use client';

import { Suspense, useEffect, useState, type ReactElement } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { getSupabaseBrowser } from '../../../lib/supabase';
import {
  signInPassword,
  signInMagicLink,
  sendPhoneOtp,
  verifyPhoneOtp,
  logAudit,
  safeNext,
  friendlyAuthError,
} from '../../../lib/auth';
import { OAuthButtons } from '../../../components/auth/OAuthButtons';
import { PasswordInput } from '../../../components/auth/PasswordInput';

type Method = 'password' | 'magic' | 'phone';

function LoginForm(): ReactElement {
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get('next'));
  const callbackError = searchParams.get('error');

  const [method, setMethod] = useState<Method>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [phoneSent, setPhoneSent] = useState(false);
  const [magicSent, setMagicSent] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function go() {
    window.location.href = next;
  }

  // Zaten giriş yapmışsa hedefe yönlendir.
  useEffect(() => {
    getSupabaseBrowser()
      .auth.getSession()
      .then(({ data }) => {
        if (data.session) window.location.href = next;
      })
      .catch(() => undefined);
  }, [next]);

  /** Şifre ile girişten sonra MFA (aal2) gerekiyor mu kontrol et. */
  async function afterPrimaryLogin(): Promise<void> {
    const sb = getSupabaseBrowser();
    const { data: aal } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal && aal.nextLevel === 'aal2' && aal.currentLevel !== 'aal2') {
      const { data: factors } = await sb.auth.mfa.listFactors();
      const totp = factors?.totp?.[0];
      if (totp) {
        setMfaFactorId(totp.id);
        return;
      }
    }
    await logAudit('login', { method });
    go();
  }

  async function onPassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { error: err } = await signInPassword(email, password);
      if (err) throw err;
      await afterPrimaryLogin();
    } catch (err) {
      setError(friendlyAuthError((err as Error).message));
    } finally {
      setLoading(false);
    }
  }

  async function onMfa(e: React.FormEvent) {
    e.preventDefault();
    if (!mfaFactorId) return;
    setLoading(true);
    setError(null);
    try {
      const sb = getSupabaseBrowser();
      const { error: err } = await sb.auth.mfa.challengeAndVerify({
        factorId: mfaFactorId,
        code: mfaCode,
      });
      if (err) throw err;
      await logAudit('login_mfa', {});
      go();
    } catch (err) {
      setError(friendlyAuthError((err as Error).message));
    } finally {
      setLoading(false);
    }
  }

  async function onMagic(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { error: err } = await signInMagicLink(email);
      if (err) throw err;
      setMagicSent(true);
    } catch (err) {
      setError(friendlyAuthError((err as Error).message));
    } finally {
      setLoading(false);
    }
  }

  async function onPhoneSend(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { error: err } = await sendPhoneOtp(phone);
      if (err) throw err;
      setPhoneSent(true);
    } catch (err) {
      setError(friendlyAuthError((err as Error).message));
    } finally {
      setLoading(false);
    }
  }

  async function onPhoneVerify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { error: err } = await verifyPhoneOtp(phone, otp);
      if (err) throw err;
      await logAudit('login', { method: 'phone' });
      go();
    } catch (err) {
      setError(friendlyAuthError((err as Error).message));
    } finally {
      setLoading(false);
    }
  }

  async function resendPhone() {
    setError(null);
    const { error: err } = await sendPhoneOtp(phone);
    if (err) setError(friendlyAuthError(err.message));
  }

  const inputCls =
    'mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0F1F4B]';
  const tabCls = (m: Method) =>
    method === m
      ? 'flex-1 rounded-md bg-[#0F1F4B] py-1.5 text-xs font-semibold text-white'
      : 'flex-1 rounded-md py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100';

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#0F1F4B] to-[#1a2d5e] px-6 py-10">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-6 text-center">
          <Link href="/" className="text-2xl font-bold text-[#0F1F4B]">
            🧭 Pusula
          </Link>
          <p className="mt-1 text-sm font-semibold text-[#D4A22E]">Karar verirken kaybolma.</p>
        </div>

        {mfaFactorId ? (
          <form onSubmit={onMfa} className="space-y-4">
            <h2 className="text-center text-xl font-bold">İki Adımlı Doğrulama</h2>
            <p className="text-center text-sm text-slate-600">
              Authenticator uygulamandaki 6 haneli kodu gir.
            </p>
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value)}
              className={`${inputCls} text-center text-lg tracking-widest`}
              placeholder="000000"
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-[#0F1F4B] py-2.5 font-semibold text-white disabled:opacity-60"
            >
              {loading ? 'Doğrulanıyor...' : 'Doğrula'}
            </button>
          </form>
        ) : magicSent ? (
          <div className="py-8 text-center">
            <div className="mb-3 text-4xl" aria-hidden>
              📬
            </div>
            <h2 className="mb-2 text-lg font-bold">E-postanı kontrol et</h2>
            <p className="text-sm text-slate-600">
              <strong>{email}</strong> adresine sihirli bir bağlantı yolladık.
            </p>
            <button
              type="button"
              onClick={() => setMagicSent(false)}
              className="mt-4 text-xs text-sky-600 underline"
            >
              ← Geri dön / farklı e-posta dene
            </button>
          </div>
        ) : (
          <>
            <h2 className="mb-4 text-center text-xl font-bold">Giriş Yap</h2>

            {callbackError && (
              <p className="mb-3 rounded-md bg-red-50 p-2 text-center text-sm text-red-600">
                Bağlantı geçersiz veya süresi dolmuş. Lütfen tekrar dene.
              </p>
            )}

            <div className="mb-4 flex gap-1 rounded-lg bg-slate-100 p-1">
              <button
                type="button"
                className={tabCls('password')}
                onClick={() => setMethod('password')}
              >
                Şifre
              </button>
              <button type="button" className={tabCls('magic')} onClick={() => setMethod('magic')}>
                Sihirli Link
              </button>
              <button type="button" className={tabCls('phone')} onClick={() => setMethod('phone')}>
                Telefon
              </button>
            </div>

            {method === 'password' && (
              <form onSubmit={onPassword} className="space-y-3">
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">E-posta</span>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputCls}
                    placeholder="ornek@pusula.tr"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Şifre</span>
                  <PasswordInput
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={setPassword}
                    className={inputCls}
                  />
                </label>
                <div className="text-right">
                  <Link href="/auth/forgot-password" className="text-xs text-sky-600 underline">
                    Şifremi unuttum
                  </Link>
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <button
                  type="submit"
                  disabled={loading || !email || !password}
                  className="w-full rounded-md bg-[#0F1F4B] py-2.5 font-semibold text-white disabled:opacity-60"
                >
                  {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
                </button>
              </form>
            )}

            {method === 'magic' && (
              <form onSubmit={onMagic} className="space-y-3">
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">E-posta</span>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputCls}
                    placeholder="ornek@pusula.tr"
                  />
                </label>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full rounded-md bg-[#0F1F4B] py-2.5 font-semibold text-white disabled:opacity-60"
                >
                  {loading ? 'Gönderiliyor...' : 'Sihirli Link Gönder'}
                </button>
              </form>
            )}

            {method === 'phone' && !phoneSent && (
              <form onSubmit={onPhoneSend} className="space-y-3">
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Telefon (+90...)</span>
                  <input
                    type="tel"
                    required
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={inputCls}
                    placeholder="+905551234567"
                  />
                </label>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <button
                  type="submit"
                  disabled={loading || !phone}
                  className="w-full rounded-md bg-[#0F1F4B] py-2.5 font-semibold text-white disabled:opacity-60"
                >
                  {loading ? 'Gönderiliyor...' : 'SMS Kodu Gönder'}
                </button>
              </form>
            )}

            {method === 'phone' && phoneSent && (
              <form onSubmit={onPhoneVerify} className="space-y-3">
                <p className="text-sm text-slate-600">
                  <strong>{phone}</strong> numarasına gelen kodu gir.
                </p>
                <input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className={`${inputCls} text-center text-lg tracking-widest`}
                  placeholder="000000"
                />
                {error && <p className="text-sm text-red-600">{error}</p>}
                <button
                  type="submit"
                  disabled={loading || !otp}
                  className="w-full rounded-md bg-[#0F1F4B] py-2.5 font-semibold text-white disabled:opacity-60"
                >
                  {loading ? 'Doğrulanıyor...' : 'Doğrula & Giriş'}
                </button>
                <div className="flex justify-between text-xs text-sky-600">
                  <button
                    type="button"
                    onClick={() => {
                      setPhoneSent(false);
                      setOtp('');
                    }}
                    className="underline"
                  >
                    Numarayı değiştir
                  </button>
                  <button type="button" onClick={() => void resendPhone()} className="underline">
                    Kodu tekrar gönder
                  </button>
                </div>
              </form>
            )}

            <div className="my-4 flex items-center gap-3 text-xs text-slate-400">
              <span className="h-px flex-1 bg-slate-200" /> veya{' '}
              <span className="h-px flex-1 bg-slate-200" />
            </div>
            <OAuthButtons />

            <p className="mt-4 text-center text-xs text-slate-500">
              Hesabın yok mu?{' '}
              <Link href="/auth/signup" className="text-sky-600 underline">
                Beta&apos;ya katıl
              </Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}

export default function LoginPage(): ReactElement {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
