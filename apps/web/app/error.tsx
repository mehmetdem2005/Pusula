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
    <main className="bg-paper text-ink flex min-h-screen items-center justify-center px-6">
      <div className="max-w-md text-center">
        <div className="mb-4 text-6xl" aria-hidden>
          🧭
        </div>
        <h1 className="text-navy mb-2 font-serif text-3xl">Beklenmedik bir hata oluştu</h1>
        <p className="text-ink-3 mb-2">Birkaç saniye sonra tekrar denemek genellikle işe yarar.</p>
        {error.digest && (
          <p className="mono text-muted mb-6 text-xs">Hata kimliği: {error.digest}</p>
        )}
        <div className="flex justify-center gap-3">
          <button type="button" onClick={reset} className="btn btn-primary">
            Tekrar Dene
          </button>
          <a href="/" className="btn btn-ghost">
            Anasayfa
          </a>
        </div>
      </div>
    </main>
  );
}
