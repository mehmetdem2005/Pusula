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
      <div className="container mx-auto px-6 py-8 max-w-5xl">
        <div className="text-sm mb-4">
          <Link href="/dashboard" className="text-sky-600 underline">← Tüm ilanlar</Link>
        </div>
        <h1 className="text-2xl font-bold mb-6">İlan Detayı</h1>

        <div className="bg-white rounded-lg p-6 mb-4">
          <div className="text-xs text-slate-500 mb-1">ID</div>
          <div className="font-mono text-sm">{id}</div>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-4">
          <div className="bg-white rounded-lg p-6 text-center">
            <div className="text-xs text-slate-500 mb-1">Skor</div>
            <div className="text-4xl font-bold text-[#0F1F4B]">--</div>
            <div className="text-xs text-slate-400 mt-1">Yükleniyor</div>
          </div>
          <div className="bg-white rounded-lg p-6 text-center">
            <div className="text-xs text-slate-500 mb-1">Etiket</div>
            <div className="text-lg font-semibold">—</div>
          </div>
          <div className="bg-white rounded-lg p-6 text-center">
            <div className="text-xs text-slate-500 mb-1">Confidence</div>
            <div className="text-lg font-semibold">—</div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-3">Skor Bileşenleri</h2>
          <p className="text-sm text-slate-500">
            Bu sayfa V1 sprint&apos;inde TanStack Query ile gerçek veriden dolduruluacak.
            Şu an iskelet.
          </p>
        </div>
      </div>
    </main>
  );
}
