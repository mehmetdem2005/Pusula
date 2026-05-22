'use client';

import { useState, type ReactElement } from 'react';
import Link from 'next/link';
import { getSupabaseBrowser } from '../../../lib/supabase';

export default function LoginPage(): ReactElement {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const supabase = getSupabaseBrowser();
      const { error: err } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });
      if (err) throw err;
      setSent(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#0F1F4B] to-[#1a2d5e] px-6">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-6 text-center">
          <Link href="/" className="text-2xl font-bold text-[#0F1F4B]">
            🧭 Pusula
          </Link>
          <p className="mt-1 text-sm font-semibold text-[#D4A22E]">Karar verirken kaybolma.</p>
        </div>

        {sent ? (
          <div className="py-8 text-center">
            <div className="mb-3 text-4xl" aria-hidden>
              📬
            </div>
            <h2 className="mb-2 text-lg font-bold">E-postanı kontrol et</h2>
            <p className="text-sm text-slate-600">
              <strong>{email}</strong> adresine sihirli bir bağlantı yolladık. Linke tıkla, oturum
              açılır.
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <h2 className="text-center text-xl font-bold">Giriş Yap</h2>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">E-posta</span>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0F1F4B]"
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
            <p className="mt-3 text-center text-xs text-slate-500">
              Hesabın yok mu?{' '}
              <Link href="/auth/signup" className="text-sky-600 underline">
                Beta&apos;ya katıl
              </Link>
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
