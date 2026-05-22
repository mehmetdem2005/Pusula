import Link from 'next/link';
import type { ReactElement } from 'react';
import { Navbar } from '../../components/Navbar';

export default function DashboardPage(): ReactElement {
  return (
    <main className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="container mx-auto px-6 py-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 text-sm">
          🚧 <strong>Beta:</strong> Kendi API key&apos;inizle çalışıyorsunuz. Provider key&apos;leri{' '}
          <Link href="/settings" className="text-sky-600 underline">Ayarlar</Link>{' '}
          sekmesinde yönetin.
        </div>

        <div className="flex items-end justify-between mb-6">
          <h1 className="text-2xl font-bold">İlanlarım</h1>
          <div className="text-sm text-slate-500">0 kayıt</div>
        </div>

        <div className="bg-white rounded-lg p-8 text-center text-slate-500 border border-dashed border-slate-300">
          <p className="text-lg font-medium mb-2">Henüz ilan yok</p>
          <p className="text-sm mb-4">
            Pusula tarayıcı eklentisini yükleyip bir ilan sayfasına gidin — ilk analiziniz burada belirecek.
          </p>
          <Link
            href="/settings"
            className="inline-block bg-[#0F1F4B] text-white px-5 py-2 rounded-full text-sm font-semibold hover:opacity-90"
          >
            Eklenti & Ayarlar
          </Link>
        </div>
      </div>
    </main>
  );
}
