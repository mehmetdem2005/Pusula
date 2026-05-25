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
    <main className="bg-night font-body text-fg flex min-h-[100dvh] items-center justify-center px-6">
      <div className="max-w-md text-center">
        <div className="mb-4 text-6xl" aria-hidden>
          🧭
        </div>
        <h1 className="font-display text-fg mb-2 text-2xl font-bold">
          Beklenmedik bir hata oluştu
        </h1>
        <p className="text-fg-dim mb-2">Birkaç saniye sonra tekrar denemek genellikle işe yarar.</p>
        {error.digest && (
          <p className="text-fg-faint mb-6 font-mono text-xs">Hata kimliği: {error.digest}</p>
        )}
        <div className="mt-4 flex justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="press bg-brand rounded-full px-5 py-2.5 text-sm font-semibold text-white"
          >
            Tekrar Dene
          </button>
          <a
            href="/"
            className="press border-line text-fg rounded-full border px-5 py-2.5 text-sm font-semibold"
          >
            Anasayfa
          </a>
        </div>
      </div>
    </main>
  );
}
