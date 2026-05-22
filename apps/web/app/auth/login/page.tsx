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
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#0F1F4B] to-[#1a2d5e] px-6">
      <div className="w-full max-w-sm bg-white rounded-2xl p-8 shadow-xl">
        <div className="text-center mb-6">
          <Link href="/" className="text-2xl font-bold text-[#0F1F4B]">
            🧭 Pusula
          </Link>
          <p className="text-sm text-[#D4A22E] font-semibold mt-1">Karar verirken kaybolma.</p>
        </div>

        {sent ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-3" aria-hidden>📬</div>
            <h2 className="text-lg font-bold mb-2">E-postanı kontrol et</h2>
            <p className="text-sm text-slate-600">
              <strong>{email}</strong> adresine sihirli bir bağlantı yolladık. Linke tıkla, oturum açılır.
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <h2 className="text-xl font-bold text-center">Giriş Yap</h2>
            <label className="block">
              <span className="text-sm text-slate-700 font-medium">E-posta</span>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0F1F4B]"
                placeholder="ornek@pusula.tr"
              />
            </label>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading || !email}
              className="w-full bg-[#0F1F4B] text-white py-2.5 rounded-md font-semibold disabled:opacity-60"
            >
              {loading ? 'Gönderiliyor...' : 'Sihirli Link Gönder'}
            </button>
            <p className="text-xs text-center text-slate-500 mt-3">
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
