import Link from 'next/link';
import type { ReactElement } from 'react';

export default function NotFound(): ReactElement {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="max-w-md text-center">
        <div className="mb-4 text-6xl" aria-hidden>
          🧭
        </div>
        <h1 className="mb-2 text-3xl font-bold text-[#0F1F4B]">Bu sayfa kaybolmuş</h1>
        <p className="mb-6 text-slate-600">
          Aradığın sayfa Pusula&apos;da görünmüyor. Anasayfadan devam edebilirsin.
        </p>
        <Link
          href="/"
          className="inline-block rounded-full bg-[#D4A22E] px-6 py-3 text-sm font-bold text-[#0F1F4B] transition hover:bg-[#e6b840]"
        >
          Anasayfaya Dön
        </Link>
      </div>
    </main>
  );
}
