'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { ReactElement } from 'react';
import { Navbar } from '../../../components/Navbar';
import { useApi } from '../../../lib/api';
import { scoreBadge, scoreColor, TRY } from '../../../lib/score-ui';
import { IlanChat } from '../../../components/IlanChat';

interface Bilesen {
  deger: number;
  agirlik: number;
  katki: number;
}
interface IlanDetail {
  id: string;
  baslik: string;
  ilan_url: string;
  fiyat_tl: number;
  il: string | null;
  ilce: string | null;
  mahalle: string | null;
  net_m2: number | null;
  oda_sayisi: string | null;
  bina_yasi: number | null;
  skor: {
    toplam: number;
    etiket: string;
    confidence: string;
    bilesenler: Record<string, Bilesen>;
    comparable: { count: number } | null;
    uyarilar: string[] | null;
  } | null;
}

const PILLAR_LABELS: Record<string, string> = {
  fiyat_avantaji: 'Fiyat Avantajı',
  kalite: 'Kalite',
  konum: 'Konum',
  risk: 'Risk',
};

export default function IlanDetayPage(): ReactElement {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : (params.id?.[0] ?? '');
  const { data, loading, error } = useApi<IlanDetail>(id ? `/v1/ilanlar/${id}` : null);

  const badge = scoreBadge(data?.skor?.etiket);

  const chatContext = data?.skor
    ? `Sen Pusula'nın emlak danışmanısın. Aşağıdaki konut ilanı ve kelepir skoru hakkında ` +
      `kullanıcıya sade, kısa ve net Türkçe yardımcı ol. Skoru DEĞİŞTİRME, yalnız yorumla.\n` +
      `İlan: ${data.baslik}. Fiyat: ${TRY.format(data.fiyat_tl)}, ${data.net_m2 ?? '?'}m², ` +
      `${[data.ilce, data.mahalle].filter(Boolean).join(' ')}, ${data.bina_yasi ?? '?'} yaş.\n` +
      `Kelepir skoru: ${Math.round(data.skor.toplam)}/100 (${data.skor.etiket}, güven: ${data.skor.confidence}). ` +
      `Pilarlar — fiyat avantajı: ${Math.round(data.skor.bilesenler.fiyat_avantaji?.deger ?? 0)}, ` +
      `kalite: ${Math.round(data.skor.bilesenler.kalite?.deger ?? 0)}, ` +
      `konum: ${Math.round(data.skor.bilesenler.konum?.deger ?? 0)}, ` +
      `risk: ${Math.round(data.skor.bilesenler.risk?.deger ?? 0)}.` +
      (data.skor.uyarilar && data.skor.uyarilar.length > 0
        ? `\nUyarılar: ${data.skor.uyarilar.join('; ')}`
        : '') +
      `\n\nTÜM METRİKLER (ayrıntılı referans, JSON — alt bileşenler, comparable medyan/IQR/z-score dahil): ${JSON.stringify(data.skor)}`
    : '';

  return (
    <main className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="container mx-auto max-w-5xl px-6 py-8">
        <div className="mb-4 text-sm">
          <Link href="/dashboard" className="text-sky-600 underline">
            ← Tüm ilanlar
          </Link>
        </div>

        {loading && <div className="h-40 animate-pulse rounded-lg bg-white" />}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            İlan yüklenemedi: {error}
          </div>
        )}

        {data && (
          <>
            <div className="mb-4 rounded-lg bg-white p-6">
              <h1 className="mb-1 text-xl font-bold">{data.baslik}</h1>
              <div className="text-sm text-slate-500">
                {[data.il, data.ilce, data.mahalle].filter(Boolean).join(' · ')}
                {data.net_m2 ? ` · ${data.net_m2}m²` : ''}
                {data.oda_sayisi ? ` · ${data.oda_sayisi}` : ''}
                {typeof data.bina_yasi === 'number' ? ` · ${data.bina_yasi} yaş` : ''}
              </div>
              <div className="mt-2 text-lg font-bold text-[#0F1F4B]">
                {TRY.format(data.fiyat_tl)}
              </div>
              <a
                href={data.ilan_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-sky-600 underline"
              >
                İlana git →
              </a>
            </div>

            {data.skor ? (
              <>
                <div className="mb-4 grid gap-4 md:grid-cols-3">
                  <div className="rounded-lg bg-white p-6 text-center">
                    <div className="mb-1 text-xs text-slate-500">Kelepir Skoru</div>
                    <div className={`text-5xl font-bold ${scoreColor(data.skor.toplam)}`}>
                      {Math.round(data.skor.toplam)}
                    </div>
                  </div>
                  <div className="flex flex-col items-center justify-center rounded-lg bg-white p-6">
                    <div className="mb-1 text-xs text-slate-500">Etiket</div>
                    <span className={`rounded-full px-3 py-1 text-sm font-semibold ${badge.cls}`}>
                      {badge.label}
                    </span>
                  </div>
                  <div className="rounded-lg bg-white p-6 text-center">
                    <div className="mb-1 text-xs text-slate-500">Güven</div>
                    <div className="text-lg font-semibold capitalize">{data.skor.confidence}</div>
                    {data.skor.comparable && (
                      <div className="mt-1 text-xs text-slate-400">
                        {data.skor.comparable.count} benzer ilan
                      </div>
                    )}
                  </div>
                </div>

                <div className="mb-4 rounded-lg bg-white p-6">
                  <h2 className="mb-4 text-lg font-semibold">Skor Bileşenleri</h2>
                  <div className="space-y-3">
                    {Object.entries(data.skor.bilesenler).map(([key, b]) => (
                      <div key={key}>
                        <div className="mb-1 flex justify-between text-sm">
                          <span className="font-medium">{PILLAR_LABELS[key] ?? key}</span>
                          <span className="text-slate-500">
                            {Math.round(b.deger)} · ağırlık %{Math.round(b.agirlik * 100)}
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-slate-100">
                          <div
                            className="h-2 rounded-full bg-[#0F1F4B]"
                            style={{ width: `${Math.max(0, Math.min(100, b.deger))}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {data.skor.uyarilar && data.skor.uyarilar.length > 0 && (
                  <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                    <div className="mb-1 font-semibold">⚠️ Uyarılar</div>
                    <ul className="list-inside list-disc space-y-1">
                      {data.skor.uyarilar.map((u, i) => (
                        <li key={i}>{u}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <IlanChat context={chatContext} />
              </>
            ) : (
              <div className="rounded-lg bg-white p-6 text-sm text-slate-500">
                Bu ilan için henüz skor hesaplanmamış.
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
