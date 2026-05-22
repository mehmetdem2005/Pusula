'use client';

import { useEffect, useState, type ReactElement } from 'react';
import Link from 'next/link';
import { getSupabaseBrowser } from '../../../lib/supabase';
import { updatePassword, logAudit } from '../../../lib/auth';

export default function ResetPasswordPage(): ReactElement {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSupabaseBrowser()
      .auth.getSession()
      .then(({ data }) => setHasSession(!!data.session))
      .catch(() => setHasSession(false));
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
    'w-full rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0F1F4B]';

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#0F1F4B] to-[#1a2d5e] px-6">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-6 text-center">
          <Link href="/" className="text-2xl font-bold text-[#0F1F4B]">
            🧭 Pusula
          </Link>
        </div>
        {done ? (
          <div className="py-6 text-center">
            <div className="mb-3 text-4xl" aria-hidden>
              ✅
            </div>
            <h2 className="mb-2 text-lg font-bold">Şifren güncellendi</h2>
            <Link
              href="/dashboard"
              className="mt-3 inline-block rounded-full bg-[#0F1F4B] px-5 py-2 text-sm font-semibold text-white"
            >
              Panele git
            </Link>
          </div>
        ) : hasSession === false ? (
          <div className="py-6 text-center">
            <h2 className="mb-2 text-lg font-bold">Bağlantı geçersiz</h2>
            <p className="text-sm text-slate-600">
              Sıfırlama bağlantısı süresi dolmuş olabilir.{' '}
              <Link href="/auth/forgot-password" className="text-sky-600 underline">
                Yeniden dene
              </Link>
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <h2 className="text-center text-xl font-bold">Yeni Şifre Belirle</h2>
            <input
              type="password"
              required
              autoComplete="new-password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputCls}
              placeholder="Yeni şifre (min 8)"
            />
            <input
              type="password"
              required
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={inputCls}
              placeholder="Yeni şifre (tekrar)"
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-[#0F1F4B] py-2.5 font-semibold text-white disabled:opacity-60"
            >
              {loading ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
