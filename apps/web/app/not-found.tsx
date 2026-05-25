import Link from 'next/link';
import type { ReactElement } from 'react';

export default function NotFound(): ReactElement {
  return (
    <main className="bg-paper text-ink flex min-h-screen items-center justify-center px-6">
      <div className="max-w-md text-center">
        <div className="mb-4 text-6xl" aria-hidden>
          🧭
        </div>
        <h1 className="text-navy mb-2 font-serif text-4xl">Bu sayfa kaybolmuş</h1>
        <p className="text-ink-3 mb-6">
          Aradığın sayfa Pusula&apos;da görünmüyor. Anasayfadan devam edebilirsin.
        </p>
        <Link href="/" className="btn btn-gold btn-lg inline-flex">
          Anasayfaya Dön
        </Link>
      </div>
    </main>
  );
}
