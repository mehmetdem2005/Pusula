import Link from 'next/link';
import type { ReactElement } from 'react';
import { Navbar } from '../../../components/Navbar';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function IlanDetayPage({ params }: PageProps): Promise<ReactElement> {
  const { id } = await params;
  return (
    <main className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="container mx-auto max-w-5xl px-6 py-8">
        <div className="mb-4 text-sm">
          <Link href="/dashboard" className="text-sky-600 underline">
            ← Tüm ilanlar
          </Link>
        </div>
        <h1 className="mb-6 text-2xl font-bold">İlan Detayı</h1>

        <div className="mb-4 rounded-lg bg-white p-6">
          <div className="mb-1 text-xs text-slate-500">ID</div>
          <div className="font-mono text-sm">{id}</div>
        </div>

        <div className="mb-4 grid gap-4 md:grid-cols-3">
          <div className="rounded-lg bg-white p-6 text-center">
            <div className="mb-1 text-xs text-slate-500">Skor</div>
            <div className="text-4xl font-bold text-[#0F1F4B]">--</div>
            <div className="mt-1 text-xs text-slate-400">Yükleniyor</div>
          </div>
          <div className="rounded-lg bg-white p-6 text-center">
            <div className="mb-1 text-xs text-slate-500">Etiket</div>
            <div className="text-lg font-semibold">—</div>
          </div>
          <div className="rounded-lg bg-white p-6 text-center">
            <div className="mb-1 text-xs text-slate-500">Confidence</div>
            <div className="text-lg font-semibold">—</div>
          </div>
        </div>

        <div className="rounded-lg bg-white p-6">
          <h2 className="mb-3 text-lg font-semibold">Skor Bileşenleri</h2>
          <p className="text-sm text-slate-500">
            Bu sayfa V1 sprint&apos;inde TanStack Query ile gerçek veriden dolduruluacak. Şu an
            iskelet.
          </p>
        </div>
      </div>
    </main>
  );
}
