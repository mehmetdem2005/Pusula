'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { ReactElement } from 'react';
import { Navbar } from '../../../components/Navbar';
import { useApi } from '../../../lib/api';
import { pillarColor, pillarLabel, scoreBand, scoreBandByValue, TRY } from '../../../lib/score-ui';
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

const BAND_VARS: Record<string, string> = {
  kacirilmaz: 'var(--kacirilmaz)',
  kelepir: 'var(--kelepir)',
  iyi: 'var(--iyi-fiyat)',
  piyasa: 'var(--piyasa)',
  pahali: 'var(--pahali)',
  asiri: 'var(--asiri)',
};

const RING_C = 264; // 2π·42

export default function IlanDetayPage(): ReactElement {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : (params.id?.[0] ?? '');
  const { data, loading, error } = useApi<IlanDetail>(id ? `/v1/ilanlar/${id}` : null);

  const chatContext = data
    ? [
        "Sen Pusula'nın emlak danışmanısın. Kullanıcıya sade, kısa ve net Türkçe yardımcı ol.",
        'Aşağıdaki JSON, bu ilanın TÜM verisini ve skor metriklerini içerir (pilarlar, alt',
        'bileşenler, comparable istatistikleri, uyarılar ve eklenen diğer tüm alanlar).',
        'Soruları yalnız bu veriye dayanarak yanıtla; ileride eklenen yeni metrikleri de',
        'aynı şekilde kullan. Skoru DEĞİŞTİRME, yalnızca yorumla ve gerekçelendir.',
        '',
        `VERİ (JSON): ${JSON.stringify(data)}`,
      ].join('\n')
    : '';

  const band = data?.skor ? scoreBand(data.skor.etiket) : null;
  const bandKey = data?.skor ? band?.band || scoreBandByValue(data.skor.toplam) : '';
  const ringColor = BAND_VARS[bandKey] ?? 'var(--navy)';

  return (
    <main className="bg-paper text-ink min-h-screen">
      <Navbar />
      <div className="shell max-w-4xl py-8 md:py-10">
        <Link href="/dashboard" className="text-ink-3 hover:text-navy text-sm font-medium">
          ← Tüm ilanlar
        </Link>

        {loading && (
          <div className="rounded-card border-hairline bg-surface mt-6 h-44 animate-pulse border" />
        )}
        {error && (
          <div className="rounded-card border-band-asiri bg-surface text-band-asiri mt-6 border p-4 text-sm">
            İlan yüklenemedi: {error}
          </div>
        )}

        {data && (
          <>
            <header className="mt-6">
              <h1 className="text-navy font-serif text-3xl leading-tight md:text-4xl">
                {data.baslik}
              </h1>
              <div className="text-muted mt-2 text-sm">
                {[data.il, data.ilce, data.mahalle].filter(Boolean).join(' · ')}
                {data.net_m2 ? ` · ${data.net_m2} m²` : ''}
                {data.oda_sayisi ? ` · ${data.oda_sayisi}` : ''}
                {typeof data.bina_yasi === 'number' ? ` · ${data.bina_yasi} yaş` : ''}
              </div>
              <div className="mt-4 flex flex-wrap items-baseline gap-4">
                <span className="text-ink font-serif text-3xl">{TRY.format(data.fiyat_tl)}</span>
                <a
                  href={data.ilan_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-navy hover:text-gold-deep text-sm font-medium"
                >
                  İlana git →
                </a>
              </div>
            </header>

            {data.skor ? (
              <>
                {/* Skor kartı */}
                <section className="rounded-card-lg border-hairline bg-surface shadow-card mt-8 grid gap-6 border p-7 sm:grid-cols-[auto_1fr] sm:items-center">
                  <div className="relative mx-auto h-[140px] w-[140px] shrink-0">
                    <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                      <circle
                        cx="50"
                        cy="50"
                        r="42"
                        fill="none"
                        stroke="var(--hairline)"
                        strokeWidth="6"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="42"
                        fill="none"
                        stroke={ringColor}
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeDasharray={RING_C}
                        strokeDashoffset={
                          RING_C * (1 - Math.max(0, Math.min(100, data.skor.toplam)) / 100)
                        }
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-navy font-serif text-4xl">
                        {Math.round(data.skor.toplam)}
                      </span>
                      <span className="text-muted text-xs">/100</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-muted text-xs uppercase tracking-wider">Kelepir skoru</div>
                    {band?.band && <span className={`band ${band.band} mt-2`}>{band.label}</span>}
                    <div className="mt-4 flex gap-8 text-sm">
                      <div>
                        <div className="text-muted text-xs">Güven</div>
                        <div className="text-ink mt-0.5 font-medium capitalize">
                          {data.skor.confidence}
                        </div>
                      </div>
                      {data.skor.comparable && (
                        <div>
                          <div className="text-muted text-xs">Benzer ilan</div>
                          <div className="mono text-ink mt-0.5 font-medium">
                            {data.skor.comparable.count}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </section>

                {/* Pilarlar (dinamik: 4 bugün, 8 gelecekte) */}
                <section className="rounded-card-lg border-hairline bg-surface mt-6 border p-7">
                  <h2 className="text-navy font-serif text-2xl">Skor bileşenleri</h2>
                  <div className="mt-5 space-y-4">
                    {Object.entries(data.skor.bilesenler).map(([key, b]) => {
                      const w = Math.max(0, Math.min(100, b.deger));
                      const color = pillarColor(key);
                      return (
                        <div key={key}>
                          <div className="mb-1.5 flex items-baseline justify-between text-sm">
                            <span className="text-ink-2 font-medium">
                              {pillarLabel(key)}{' '}
                              <span className="mono text-muted text-xs">
                                w {b.agirlik.toFixed(2)}
                              </span>
                            </span>
                            <span className="mono text-ink">{Math.round(b.deger)}</span>
                          </div>
                          <span className="bg-hairline block h-2 overflow-hidden rounded-full">
                            <span
                              className="block h-full rounded-full"
                              style={{ width: `${w}%`, background: color }}
                            />
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </section>

                {data.skor.uyarilar && data.skor.uyarilar.length > 0 && (
                  <section className="rounded-card border-hairline bg-surface mt-6 border p-6">
                    <h2 className="text-pillar-risk flex items-center gap-2 font-serif text-xl">
                      Uyarılar
                    </h2>
                    <ul className="text-ink-2 mt-3 space-y-2 text-sm">
                      {data.skor.uyarilar.map((u, i) => (
                        <li key={i} className="flex gap-2.5">
                          <span className="text-pillar-risk">•</span>
                          {u}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                <div className="mt-8">
                  <IlanChat context={chatContext} />
                </div>
              </>
            ) : (
              <div className="rounded-card-lg border-hairline bg-surface text-muted mt-8 border p-8 text-sm">
                Bu ilan için henüz skor hesaplanmamış.
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
