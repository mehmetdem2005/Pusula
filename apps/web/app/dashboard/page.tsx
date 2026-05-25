'use client';

import Link from 'next/link';
import type { ReactElement } from 'react';
import { Navbar } from '../../components/Navbar';
import { useApi } from '../../lib/api';
import { scoreBand, scoreColor, TRY } from '../../lib/score-ui';
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

  // KPI'lar portföydeki ilanlardan client-side türetilir (backend ayrı uç sağlamıyor).
  const scored = ilanlar.filter((i) => i.skor);
  const avgScore = scored.length
    ? Math.round(scored.reduce((s, i) => s + (i.skor?.toplam ?? 0), 0) / scored.length)
    : null;
  const kelepirCount = ilanlar.filter(
    (i) => i.skor?.etiket === 'kacirilmaz' || i.skor?.etiket === 'kelepir',
  ).length;

  const kpis: { label: string; value: string }[] = [
    { label: 'Toplam ilan', value: String(ilanlar.length) },
    { label: 'Ortalama skor', value: avgScore !== null ? `${avgScore}` : '—' },
    { label: 'Kelepir+', value: String(kelepirCount) },
    { label: 'Skorlanan', value: String(scored.length) },
  ];

  const portfolioContext = [
    "Sen Pusula'nın emlak danışmanısın. Kullanıcının TÜM ilanları ve skorları aşağıdaki JSON'da.",
    'Sade, kısa Türkçe yardımcı ol: karşılaştır, en iyi/en riskli olanı bul, ortalama hesapla,',
    'öneride bulun. İleride eklenen yeni metrikleri de kullan. Skoru DEĞİŞTİRME, yalnız yorumla.',
    '',
    `İLANLAR (JSON): ${JSON.stringify(ilanlar)}`,
  ].join('\n');

  return (
    <main className="bg-paper text-ink min-h-screen">
      <Navbar />
      <div className="shell py-8 md:py-10">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h1 className="h3 text-navy">İlanlarım</h1>
            <p className="text-muted mt-1 text-sm">Analiz edilen ilanların ve portföy özetin.</p>
          </div>
          <div className="mono text-muted text-sm">{loading ? '…' : `${ilanlar.length} kayıt`}</div>
        </div>

        {!loading && ilanlar.length > 0 && (
          <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
            {kpis.map((k) => (
              <div key={k.label} className="rounded-card border-hairline bg-surface border p-5">
                <div className="text-muted text-xs">{k.label}</div>
                <div className="mono text-navy mt-2 text-3xl font-medium">{k.value}</div>
              </div>
            ))}
          </div>
        )}

        <div className="mb-8">
          <PasteIngest />
        </div>

        {error && (
          <div className="rounded-card border-band-asiri bg-surface text-band-asiri border p-4 text-sm">
            İlanlar yüklenemedi: {error}
          </div>
        )}

        {loading && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="rounded-card border-hairline bg-surface h-44 animate-pulse border"
              />
            ))}
          </div>
        )}

        {!loading && !error && ilanlar.length === 0 && (
          <div className="rounded-card-lg border-hairline-strong bg-surface border border-dashed p-12 text-center">
            <p className="text-navy font-serif text-2xl">Henüz ilan yok</p>
            <p className="text-ink-3 mx-auto mt-2 max-w-md text-sm">
              Pusula tarayıcı eklentisini yükleyip bir ilan sayfasına gidin — ya da yukarıdan bir
              ilan bağlantısı yapıştırın. İlk analiziniz burada belirecek.
            </p>
            <Link href="/settings" className="btn btn-gold mt-6 inline-flex">
              Eklenti &amp; Ayarlar
            </Link>
          </div>
        )}

        {!loading && ilanlar.length > 0 && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {ilanlar.map((ilan) => {
              const band = scoreBand(ilan.skor?.etiket);
              const loc = [ilan.ilce, ilan.mahalle].filter(Boolean).join(' · ');
              const meta = [ilan.net_m2 ? `${ilan.net_m2} m²` : null, ilan.oda_sayisi].filter(
                Boolean,
              );
              return (
                <Link
                  key={ilan.id}
                  href={`/ilan/${ilan.id}`}
                  className="rounded-card border-hairline bg-surface hover:shadow-card group flex flex-col border p-5 transition-shadow"
                >
                  <div className="flex items-start justify-between gap-3">
                    {band.band ? (
                      <span className={`band ${band.band}`}>{band.label}</span>
                    ) : (
                      <span className="text-muted text-xs">Skor yok</span>
                    )}
                    {ilan.skor && (
                      <span
                        className={`font-serif text-3xl leading-none ${scoreColor(ilan.skor.toplam)}`}
                      >
                        {Math.round(ilan.skor.toplam)}
                      </span>
                    )}
                  </div>
                  <h2 className="text-ink mt-3 line-clamp-2 font-medium leading-snug">
                    {ilan.baslik}
                  </h2>
                  {loc && <div className="text-muted mt-1 text-xs">{loc}</div>}
                  <div className="mt-auto pt-4">
                    <div className="text-navy font-serif text-xl">{TRY.format(ilan.fiyat_tl)}</div>
                    {meta.length > 0 && (
                      <div className="mono text-muted mt-1 text-xs">{meta.join(' · ')}</div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {!loading && (
          <div className="mt-10">
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
