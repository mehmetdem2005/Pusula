import Link from 'next/link';
import type { ReactElement } from 'react';
import { Navbar } from '../../components/Navbar';

export default function DashboardPage(): ReactElement {
  return (
    <main className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="container mx-auto px-6 py-8">
        <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm">
          🚧 <strong>Beta:</strong> Kendi API key&apos;inizle çalışıyorsunuz. Provider key&apos;leri{' '}
          <Link href="/settings" className="text-sky-600 underline">
            Ayarlar
          </Link>{' '}
          sekmesinde yönetin.
        </div>

        <div className="mb-6 flex items-end justify-between">
          <h1 className="text-2xl font-bold">İlanlarım</h1>
          <div className="text-sm text-slate-500">0 kayıt</div>
        </div>

        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
          <p className="mb-2 text-lg font-medium">Henüz ilan yok</p>
          <p className="mb-4 text-sm">
            Pusula tarayıcı eklentisini yükleyip bir ilan sayfasına gidin — ilk analiziniz burada
            belirecek.
          </p>
          <Link
            href="/settings"
            className="inline-block rounded-full bg-[#0F1F4B] px-5 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Eklenti & Ayarlar
          </Link>
        </div>
      </div>
    </main>
  );
}
