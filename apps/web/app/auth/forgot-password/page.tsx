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
    <main className="bg-night font-body text-fg flex min-h-[100dvh] items-center justify-center px-6">
      <div className="border-line bg-panel w-full max-w-sm rounded-2xl border p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <Link href="/" className="font-display text-fg text-2xl font-bold tracking-tight">
            Pusula
          </Link>
        </div>
        {sent ? (
          <div className="py-6 text-center">
            <div className="mb-3 text-4xl" aria-hidden>
              📬
            </div>
            <h2 className="font-display text-fg mb-2 text-xl font-bold">E-postanı kontrol et</h2>
            <p className="text-fg-dim text-sm">
              <strong className="text-fg">{email}</strong> adresine şifre sıfırlama bağlantısı
              yolladık.
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <h2 className="font-display text-fg text-center text-2xl font-bold">
              Şifreni mi unuttun?
            </h2>
            <p className="text-fg-dim text-center text-sm">
              E-postanı gir, sıfırlama bağlantısı yollayalım.
            </p>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border-line bg-panel-soft text-fg placeholder:text-fg-faint focus:border-brand w-full rounded-lg border px-3 py-2 focus:outline-none"
              placeholder="ornek@pusula.tr"
            />
            {error && <p className="text-danger text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading || !email}
              className="press bg-brand w-full rounded-lg py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {loading ? 'Gönderiliyor...' : 'Sıfırlama Linki Gönder'}
            </button>
            <p className="text-fg-faint text-center text-xs">
              <Link href="/auth/login" className="text-brand underline">
                Girişe dön
              </Link>
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
