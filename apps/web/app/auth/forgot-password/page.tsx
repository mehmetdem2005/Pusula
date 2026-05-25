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
    <main className="bg-paper text-ink flex min-h-screen items-center justify-center px-6">
      <div className="rounded-card-lg border-hairline bg-surface shadow-card w-full max-w-sm border p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <Link href="/" className="brand !text-2xl">
            <span className="brand-mark" aria-hidden="true" />
            <span>Pusula</span>
          </Link>
        </div>
        {sent ? (
          <div className="py-6 text-center">
            <div className="mb-3 text-4xl" aria-hidden>
              📬
            </div>
            <h2 className="text-navy mb-2 font-serif text-xl">E-postanı kontrol et</h2>
            <p className="text-ink-3 text-sm">
              <strong>{email}</strong> adresine şifre sıfırlama bağlantısı yolladık.
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <h2 className="text-navy text-center font-serif text-2xl">Şifreni mi unuttun?</h2>
            <p className="text-ink-3 text-center text-sm">
              E-postanı gir, sıfırlama bağlantısı yollayalım.
            </p>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-card-sm border-hairline-strong bg-paper text-ink focus:border-navy focus:ring-navy w-full border px-3 py-2 focus:outline-none focus:ring-1"
              placeholder="ornek@pusula.tr"
            />
            {error && <p className="text-band-asiri text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading || !email}
              className="btn btn-primary w-full disabled:opacity-60"
            >
              {loading ? 'Gönderiliyor...' : 'Sıfırlama Linki Gönder'}
            </button>
            <p className="text-muted text-center text-xs">
              <Link href="/auth/login" className="text-navy hover:text-gold-deep underline">
                Girişe dön
              </Link>
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
