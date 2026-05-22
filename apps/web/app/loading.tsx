import type { ReactElement } from 'react';

export default function Loading(): ReactElement {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="mb-3 inline-block animate-pulse text-5xl" aria-hidden>
          🧭
        </div>
        <p className="text-sm text-slate-500">Yükleniyor...</p>
      </div>
    </main>
  );
}
