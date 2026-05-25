'use client';

import { useEffect, useState, type ReactElement } from 'react';
import Link from 'next/link';
import { getSupabaseBrowser } from '../../../lib/supabase';
import { updatePassword, logAudit } from '../../../lib/auth';
import { PasswordInput } from '../../../components/auth/PasswordInput';

export default function ResetPasswordPage(): ReactElement {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sb = getSupabaseBrowser();
    // Recovery oturumu URL'den ASENKRON kurulur → tek getSession yarışı "geçersiz" gösterebilir.
    // onAuthStateChange ile PASSWORD_RECOVERY/SIGNED_IN olaylarını da dinle.
    let settled = false;
    const { data: sub } = sb.auth.onAuthStateChange((event, session) => {
      if (session || event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        settled = true;
        setHasSession(true);
      }
    });
    sb.auth.getSession().then(({ data }) => {
      if (data.session) {
        settled = true;
        setHasSession(true);
      } else {
        // Olay gelmesi için kısa pencere tanı; gelmezse geçersiz.
        setTimeout(() => {
          if (!settled) setHasSession(false);
        }, 2500);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('Şifre en az 8 karakter olmalı.');
      return;
    }
    if (password !== confirm) {
      setError('Şifreler eşleşmiyor.');
      return;
    }
    setLoading(true);
    try {
      const { error: err } = await updatePassword(password);
      if (err) throw err;
      await logAudit('password_reset', {});
      setDone(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const inputCls =
    'w-full rounded-lg border border-line bg-panel-soft px-3 py-2 text-fg placeholder:text-fg-faint focus:border-brand focus:outline-none';
  const btnCls =
    'press w-full rounded-lg bg-brand py-2.5 text-sm font-semibold text-white disabled:opacity-50';

  return (
    <main className="bg-night font-body text-fg flex min-h-[100dvh] items-center justify-center px-6">
      <div className="border-line bg-panel w-full max-w-sm rounded-2xl border p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <Link href="/" className="font-display text-fg text-2xl font-bold tracking-tight">
            Pusula
          </Link>
        </div>
        {done ? (
          <div className="py-6 text-center">
            <div className="mb-3 text-4xl" aria-hidden>
              ✅
            </div>
            <h2 className="font-display text-fg mb-3 text-xl font-bold">Şifren güncellendi</h2>
            <Link
              href="/kesfet"
              className="press bg-brand inline-block rounded-lg px-5 py-2.5 text-sm font-semibold text-white"
            >
              Akışa git
            </Link>
          </div>
        ) : hasSession === false ? (
          <div className="py-6 text-center">
            <h2 className="font-display text-fg mb-2 text-xl font-bold">Bağlantı geçersiz</h2>
            <p className="text-fg-dim text-sm">
              Sıfırlama bağlantısı süresi dolmuş olabilir.{' '}
              <Link href="/auth/forgot-password" className="text-brand underline">
                Yeniden dene
              </Link>
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <h2 className="font-display text-fg text-center text-2xl font-bold">
              Yeni Şifre Belirle
            </h2>
            <PasswordInput
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={setPassword}
              className={inputCls}
              placeholder="Yeni şifre (min 8)"
            />
            <PasswordInput
              required
              autoComplete="new-password"
              value={confirm}
              onChange={setConfirm}
              className={inputCls}
              placeholder="Yeni şifre (tekrar)"
            />
            {error && <p className="text-danger text-sm">{error}</p>}
            <button type="submit" disabled={loading} className={btnCls}>
              {loading ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
