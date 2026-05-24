'use client';

import { useEffect } from 'react';
import type { ReactElement } from 'react';

/**
 * Global hata sınırı — Next.js 15 error boundary.
 * (Sentry kurulursa instrumentation üzerinden otomatik yakalar; burada manuel no-op çağrı yok.)
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): ReactElement {
  useEffect(() => {
    console.error('[Pusula] app error:', error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="max-w-md text-center">
        <div className="mb-4 text-6xl" aria-hidden>
          🧭
        </div>
        <h1 className="mb-2 text-2xl font-bold text-[#0F1F4B]">Beklenmedik bir hata oluştu</h1>
        <p className="mb-2 text-slate-600">
          Birkaç saniye sonra tekrar denemek genellikle işe yarar.
        </p>
        {error.digest && (
          <p className="mb-6 font-mono text-xs text-slate-400">Hata kimliği: {error.digest}</p>
        )}
        <div className="flex justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-full bg-[#0F1F4B] px-5 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Tekrar Dene
          </button>
          <a
            href="/"
            className="rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Anasayfa
          </a>
        </div>
      </div>
    </main>
  );
}
