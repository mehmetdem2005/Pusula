'use client';

import { useState, type ReactElement } from 'react';
import Link from 'next/link';
import { sendPasswordReset } from '../../../lib/auth';

export default function ForgotPasswordPage(): ReactElement {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { error: err } = await sendPasswordReset(email);
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
        </div>
        {sent ? (
          <div className="py-6 text-center">
            <div className="mb-3 text-4xl" aria-hidden>
              📬
            </div>
            <h2 className="mb-2 text-lg font-bold">E-postanı kontrol et</h2>
            <p className="text-sm text-slate-600">
              <strong>{email}</strong> adresine şifre sıfırlama bağlantısı yolladık.
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <h2 className="text-center text-xl font-bold">Şifreni mi unuttun?</h2>
            <p className="text-center text-sm text-slate-600">
              E-postanı gir, sıfırlama bağlantısı yollayalım.
            </p>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0F1F4B]"
              placeholder="ornek@pusula.tr"
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading || !email}
              className="w-full rounded-md bg-[#0F1F4B] py-2.5 font-semibold text-white disabled:opacity-60"
            >
              {loading ? 'Gönderiliyor...' : 'Sıfırlama Linki Gönder'}
            </button>
            <p className="text-center text-xs text-slate-500">
              <Link href="/auth/login" className="text-sky-600 underline">
                Girişe dön
              </Link>
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
