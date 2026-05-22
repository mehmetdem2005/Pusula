import type { ReactElement } from 'react';

export default function Loading(): ReactElement {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="inline-block animate-pulse text-5xl mb-3" aria-hidden>
          🧭
        </div>
        <p className="text-sm text-slate-500">Yükleniyor...</p>
      </div>
    </main>
  );
}
