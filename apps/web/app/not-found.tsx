import Link from 'next/link';
import type { ReactElement } from 'react';

export default function NotFound(): ReactElement {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
      <div className="max-w-md text-center">
        <div className="text-6xl mb-4" aria-hidden>
          🧭
        </div>
        <h1 className="text-3xl font-bold mb-2 text-[#0F1F4B]">Bu sayfa kaybolmuş</h1>
        <p className="text-slate-600 mb-6">
          Aradığın sayfa Pusula&apos;da görünmüyor. Anasayfadan devam edebilirsin.
        </p>
        <Link
          href="/"
          className="inline-block bg-[#D4A22E] text-[#0F1F4B] px-6 py-3 rounded-full font-bold text-sm hover:bg-[#e6b840] transition"
        >
          Anasayfaya Dön
        </Link>
      </div>
    </main>
  );
}
