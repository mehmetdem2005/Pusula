import Link from 'next/link';
import type { ReactElement } from 'react';

export default function NotFound(): ReactElement {
  return (
    <main className="bg-night font-body text-fg flex min-h-[100dvh] items-center justify-center px-6">
      <div className="max-w-md text-center">
        <div className="mb-4 text-6xl" aria-hidden>
          🧭
        </div>
        <h1 className="font-display text-fg mb-2 text-3xl font-bold">Bu sayfa kaybolmuş</h1>
        <p className="text-fg-dim mb-6">
          Aradığın sayfa Pusula&apos;da görünmüyor. Anasayfadan devam edebilirsin.
        </p>
        <Link
          href="/"
          className="press brand-glow bg-brand inline-flex rounded-full px-6 py-3 text-sm font-semibold text-white"
        >
          Anasayfaya Dön
        </Link>
      </div>
    </main>
  );
}
