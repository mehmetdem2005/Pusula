'use client';

import { useEffect } from 'react';
import type { ReactElement } from 'react';

/**
 * Global hata sınırı — Next.js 15 error boundary.
 * Sentry'ye browser-side capture düşer (NEXT_PUBLIC_SENTRY_DSN varsa).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): ReactElement {
  useEffect(() => {
    // Tip-güvenli dinamik import — Sentry yüklüyse capture
    void (async () => {
      try {
        const Sentry = await import('@sentry/nextjs').catch(() => null);
        if (Sentry) {
          Sentry.captureException(error, { tags: { boundary: 'app-error' } });
        }
      } catch {
        // ignore
      }
    })();
  }, [error]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
      <div className="max-w-md text-center">
        <div className="text-6xl mb-4" aria-hidden>
          🧭
        </div>
        <h1 className="text-2xl font-bold mb-2 text-[#0F1F4B]">Beklenmedik bir hata oluştu</h1>
        <p className="text-slate-600 mb-2">
          Sorunu kaydettik. Birkaç saniye sonra tekrar denemek genellikle işe yarar.
        </p>
        {error.digest && (
          <p className="text-xs text-slate-400 font-mono mb-6">Hata kimliği: {error.digest}</p>
        )}
        <div className="flex gap-3 justify-center">
          <button
            type="button"
            onClick={reset}
            className="bg-[#0F1F4B] text-white px-5 py-2 rounded-full text-sm font-semibold hover:opacity-90"
          >
            Tekrar Dene
          </button>
          <a
            href="/"
            className="border border-slate-300 text-slate-700 px-5 py-2 rounded-full text-sm font-semibold hover:bg-slate-100"
          >
            Anasayfa
          </a>
        </div>
      </div>
    </main>
  );
}
