'use client';

import { useState, type ReactElement } from 'react';
import { signInOAuth, type OAuthProvider } from '../../lib/auth';

const PROVIDERS: { id: OAuthProvider; label: string; icon: string }[] = [
  { id: 'google', label: 'Google ile devam et', icon: 'G' },
  { id: 'facebook', label: 'Facebook ile devam et', icon: 'f' },
];

/**
 * Google / Facebook OAuth butonları. signInWithOAuth provider'ı Supabase'de
 * etkin değilse hata döner — UI hazır, etkinleştirme credential gelince yapılır.
 */
export function OAuthButtons(): ReactElement {
  const [busy, setBusy] = useState<OAuthProvider | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onClick(provider: OAuthProvider) {
    setBusy(provider);
    setError(null);
    const { error: err } = await signInOAuth(provider);
    if (err) {
      setError(err.message);
      setBusy(null);
    }
    // başarılıysa tarayıcı provider'a yönlenir
  }

  return (
    <div className="space-y-2">
      {PROVIDERS.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => onClick(p.id)}
          disabled={busy !== null}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-slate-300 bg-white py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-xs font-bold">
            {p.icon}
          </span>
          {busy === p.id ? 'Yönlendiriliyor...' : p.label}
        </button>
      ))}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
