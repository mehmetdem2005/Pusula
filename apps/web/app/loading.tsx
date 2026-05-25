import type { ReactElement } from 'react';

export default function Loading(): ReactElement {
  return (
    <main className="bg-paper flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mb-3 inline-block animate-pulse text-5xl" aria-hidden>
          🧭
        </div>
        <p className="text-muted text-sm">Yükleniyor...</p>
      </div>
    </main>
  );
}
