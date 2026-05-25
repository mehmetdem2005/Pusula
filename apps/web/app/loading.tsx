import type { ReactElement } from 'react';

export default function Loading(): ReactElement {
  return (
    <main className="bg-night font-body flex min-h-[100dvh] items-center justify-center">
      <div className="text-center">
        <div className="mb-3 inline-block animate-pulse text-5xl" aria-hidden>
          🧭
        </div>
        <p className="text-fg-dim text-sm">Yükleniyor...</p>
      </div>
    </main>
  );
}
