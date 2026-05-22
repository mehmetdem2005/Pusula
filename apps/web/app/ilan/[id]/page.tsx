'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState, type ReactElement } from 'react';
import { Navbar } from '../../../components/Navbar';
import { useApi, authedFetch } from '../../../lib/api';
import { scoreBadge, scoreColor, TRY } from '../../../lib/score-ui';

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

  const [aiText, setAiText] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  async function explain() {
    if (!data?.skor) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const s = data.skor;
      const prompt =
        `Bir konut ilanı için kelepir skoru ${Math.round(s.toplam)}/100 (${s.etiket}). ` +
        `Bileşenler — fiyat avantajı: ${Math.round(s.bilesenler.fiyat_avantaji?.deger ?? 0)}, ` +
        `kalite: ${Math.round(s.bilesenler.kalite?.deger ?? 0)}, konum: ${Math.round(s.bilesenler.konum?.deger ?? 0)}, ` +
        `risk: ${Math.round(s.bilesenler.risk?.deger ?? 0)}. Fiyat: ${TRY.format(data.fiyat_tl)}, ` +
        `${data.net_m2 ?? '?'}m², ${data.ilce ?? ''} ${data.mahalle ?? ''}. ` +
        `Bu skoru kullanıcıya sade Türkçe açıkla, güçlü/zayıf yönleri ve kısa bir pazarlık önerisi ver. Skoru değiştirme.`;
      const resp = await authedFetch<{ text: string }>('/v1/llm/chat', {
        method: 'POST',
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
          options: { taskType: 'score-explanation' },
        }),
      });
      setAiText(resp.text);
    } catch (e) {
      setAiError((e as Error).message);
    } finally {
      setAiLoading(false);
    }
  }

  const badge = scoreBadge(data?.skor?.etiket);

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

                <div className="rounded-lg bg-white p-6">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-lg font-semibold">AI Açıklaması</h2>
                    <button
                      type="button"
                      onClick={() => void explain()}
                      disabled={aiLoading}
                      className="rounded-md bg-[#D4A22E] px-4 py-2 text-sm font-semibold text-[#0F1F4B] disabled:opacity-60"
                    >
                      {aiLoading ? 'Düşünüyor...' : aiText ? 'Yeniden açıkla' : 'AI ile açıkla'}
                    </button>
                  </div>
                  {aiError && <p className="text-sm text-red-600">{aiError}</p>}
                  {aiText ? (
                    <p className="whitespace-pre-wrap text-sm text-slate-700">{aiText}</p>
                  ) : (
                    <p className="text-sm text-slate-500">
                      Skorun neden böyle olduğunu ve pazarlık önerisini AI ile öğren.
                    </p>
                  )}
                </div>
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
