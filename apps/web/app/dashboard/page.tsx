'use client';

import Link from 'next/link';
import type { ReactElement } from 'react';
import { Navbar } from '../../components/Navbar';
import { useApi } from '../../lib/api';
import { scoreBadge, scoreColor, TRY } from '../../lib/score-ui';
import { IlanChat } from '../../components/IlanChat';
import { PasteIngest } from '../../components/PasteIngest';

interface IlanCard {
  id: string;
  baslik: string;
  fiyat_tl: number;
  il: string | null;
  ilce: string | null;
  mahalle: string | null;
  net_m2: number | null;
  oda_sayisi: string | null;
  skor: { toplam: number; etiket: string; confidence: string } | null;
}

export default function DashboardPage(): ReactElement {
  const { data, loading, error } = useApi<IlanCard[]>('/v1/ilanlar');
  const ilanlar = data ?? [];

  // Portföy asistanı context'i — API'nin döndürdüğü tüm ilan verisinden dinamik üretilir.
  const portfolioContext = [
    "Sen Pusula'nın emlak danışmanısın. Kullanıcının TÜM ilanları ve skorları aşağıdaki JSON'da.",
    'Sade, kısa Türkçe yardımcı ol: karşılaştır, en iyi/en riskli olanı bul, ortalama hesapla,',
    'öneride bulun. İleride eklenen yeni metrikleri de kullan. Skoru DEĞİŞTİRME, yalnız yorumla.',
    '',
    `İLANLAR (JSON): ${JSON.stringify(ilanlar)}`,
  ].join('\n');

  return (
    <main className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="container mx-auto px-6 py-8">
        <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm">
          🚧 <strong>Beta:</strong> AI analizleri uygulama içinde sağlanır. Eklentiyi yükleyip bir
          ilan sayfasına gidin — analiz burada belirir.
        </div>

        <PasteIngest />

        <div className="mb-6 flex items-end justify-between">
          <h1 className="text-2xl font-bold">İlanlarım</h1>
          <div className="text-sm text-slate-500">
            {loading ? '...' : `${ilanlar.length} kayıt`}
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            İlanlar yüklenemedi: {error}
          </div>
        )}

        {loading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-32 animate-pulse rounded-lg bg-white" />
            ))}
          </div>
        )}

        {!loading && !error && ilanlar.length === 0 && (
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
        )}

        {!loading && ilanlar.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ilanlar.map((ilan) => {
              const badge = scoreBadge(ilan.skor?.etiket);
              return (
                <Link
                  key={ilan.id}
                  href={`/ilan/${ilan.id}`}
                  className="block rounded-lg bg-white p-5 shadow-sm transition hover:shadow-md"
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <h2 className="line-clamp-2 text-sm font-semibold text-slate-800">
                      {ilan.baslik}
                    </h2>
                    {ilan.skor && (
                      <span className={`text-2xl font-bold ${scoreColor(ilan.skor.toplam)}`}>
                        {Math.round(ilan.skor.toplam)}
                      </span>
                    )}
                  </div>
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${badge.cls}`}
                  >
                    {badge.label}
                  </span>
                  <div className="mt-3 text-lg font-bold text-[#0F1F4B]">
                    {TRY.format(ilan.fiyat_tl)}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {[ilan.ilce, ilan.mahalle].filter(Boolean).join(' · ')}
                    {ilan.net_m2 ? ` · ${ilan.net_m2}m²` : ''}
                    {ilan.oda_sayisi ? ` · ${ilan.oda_sayisi}` : ''}
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {!loading && (
          <div className="mt-8">
            <IlanChat
              context={portfolioContext}
              intro="Tüm ilanlarını biliyorum — karşılaştırma, en iyi/en riskli olanlar, ortalama skor. Yazarak veya konuşarak sor."
              suggestions={[
                'En yüksek skorlu ilanım hangisi?',
                'Riskli olanları göster',
                'Ortalama skorum kaç?',
                'Hangisini almalıyım?',
              ]}
            />
          </div>
        )}
      </div>
    </main>
  );
}
