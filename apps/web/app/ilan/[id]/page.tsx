'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState, type ReactElement } from 'react';
import { authedFetch, useApi } from '../../../lib/api';
import { pillarColor, pillarLabel, scoreBand, scoreBandByValue, TRY } from '../../../lib/score-ui';
import { IlanChat } from '../../../components/IlanChat';
import { SaveButton } from '../../../components/SaveButton';
import { BottomNav } from '../../../components/shell/BottomNav';

interface Bilesen {
  deger: number;
  agirlik: number;
  katki: number;
}
interface MediaItem {
  id: string;
  type: string;
  url: string | null;
  poster: string | null;
  is_ai_generated: boolean;
}
interface IlanDetail {
  id: string;
  baslik: string;
  ilan_url: string | null;
  fiyat_tl: number;
  kategori: string;
  aciklama: string | null;
  il: string | null;
  ilce: string | null;
  mahalle: string | null;
  net_m2: number | null;
  oda_sayisi: string | null;
  bina_yasi: number | null;
  status: string;
  visibility: string;
  is_owner: boolean;
  owner: { id: string; handle: string | null; avatar_url: string | null };
  media: MediaItem[];
  like_count: number;
  liked_by_me: boolean;
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
const KATEGORI: Record<string, string> = { konut: 'Konut', arsa: 'Arsa', oto: 'Araç' };
const RING_C = 264; // 2π·42

export default function IlanDetayPage(): ReactElement {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === 'string' ? params.id : (params.id?.[0] ?? '');
  const { data, loading, error } = useApi<IlanDetail>(id ? `/v1/ilanlar/${id}` : null);

  const [liked, setLiked] = useState<boolean | null>(null);
  const [likeBump, setLikeBump] = useState(0);
  const [showAnaliz, setShowAnaliz] = useState(false);

  const isLiked = liked ?? data?.liked_by_me ?? false;
  const likeCount = (data?.like_count ?? 0) + likeBump;

  function toggleLike() {
    if (!data) return;
    const next = !isLiked;
    setLiked(next);
    setLikeBump((b) => b + (next ? 1 : -1));
    void authedFetch('/v1/events', {
      method: 'POST',
      body: JSON.stringify({
        events: [{ listing_id: data.id, event_type: next ? 'like' : 'unlike' }],
      }),
    }).catch(() => undefined);
  }

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
  const ringColor = BAND_VARS[bandKey] ?? 'var(--c-brand)';

  const loc = data ? [data.il, data.ilce, data.mahalle].filter(Boolean).join(' · ') : '';
  const attrs = data
    ? [
        data.net_m2 ? `${data.net_m2} m²` : null,
        data.oda_sayisi,
        typeof data.bina_yasi === 'number' ? `${data.bina_yasi} yaş` : null,
      ].filter(Boolean)
    : [];

  return (
    <main className="bg-night font-body text-fg min-h-[100dvh]">
      {/* Glass üst bar */}
      <header className="glass border-line sticky top-0 z-30 flex items-center justify-between border-b px-2 py-2.5">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Geri"
          className="press text-fg flex h-9 w-9 items-center justify-center rounded-full"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <span className="text-fg text-sm font-semibold">İlan</span>
        {data?.is_owner ? (
          <span className="text-fg-dim rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium capitalize">
            {data.status}
          </span>
        ) : (
          <span className="h-9 w-9" />
        )}
      </header>

      <div className="mx-auto w-full max-w-xl pb-28">
        {loading && <div className="bg-panel mx-3 mt-3 aspect-[4/5] animate-pulse rounded-xl" />}
        {error && (
          <div className="border-danger text-danger mx-3 mt-4 rounded-xl border p-4 text-sm">
            İlan yüklenemedi: {error}
          </div>
        )}

        {data && (
          <>
            {/* Sahip satırı */}
            <Link
              href={data.owner.handle ? `/u/${data.owner.handle}` : '#'}
              className="flex items-center gap-2.5 px-4 py-3"
            >
              <span className="from-panel-soft to-panel ring-line grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br text-sm font-semibold ring-1">
                {(data.owner.handle ?? 'K')[0]?.toUpperCase()}
              </span>
              <span className="text-fg text-sm font-semibold">
                @{data.owner.handle ?? 'kullanıcı'}
              </span>
              <span className="text-fg-dim ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide">
                {KATEGORI[data.kategori] ?? data.kategori}
              </span>
            </Link>

            {/* Medya karuseli */}
            <Carousel media={data.media} title={data.baslik} />

            {/* Aksiyon satırı */}
            <div className="flex items-center gap-5 px-4 py-3">
              <button
                type="button"
                onClick={toggleLike}
                aria-pressed={isLiked}
                aria-label="Beğen"
                className={`press flex items-center gap-1.5 ${isLiked ? 'text-like' : 'text-fg'}`}
              >
                <Icon name="heart" size={26} filled={isLiked} />
                {likeCount > 0 && <span className="text-sm font-semibold">{likeCount}</span>}
              </button>
              <SaveButton
                listingId={data.id}
                className="press text-fg flex items-center gap-1.5 text-sm font-semibold"
              />
              <div className="ml-auto" />
            </div>

            {/* Başlık + fiyat + konum */}
            <div className="px-4">
              <div className="font-display text-fg text-xl font-bold leading-tight">
                {TRY.format(data.fiyat_tl)}
              </div>
              <h1 className="text-fg mt-1 text-base font-medium leading-snug">{data.baslik}</h1>
              {loc && <div className="text-fg-dim mt-1 text-sm">{loc}</div>}
              {attrs.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {attrs.map((a) => (
                    <span
                      key={a as string}
                      className="bg-panel text-fg-dim rounded-lg px-2.5 py-1 text-xs font-medium"
                    >
                      {a}
                    </span>
                  ))}
                </div>
              )}
              {data.aciklama && (
                <p className="text-fg-dim mt-4 whitespace-pre-line text-sm leading-relaxed">
                  {data.aciklama}
                </p>
              )}
              {data.ilan_url && (
                <a
                  href={data.ilan_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand mt-3 inline-block text-sm font-semibold"
                >
                  Orijinal ilana git →
                </a>
              )}
            </div>

            {/* Sahip-özel AI/skor paneli */}
            {data.is_owner && data.skor && (
              <section className="border-line mx-4 mt-6 border-t pt-5">
                <button
                  type="button"
                  onClick={() => setShowAnaliz((s) => !s)}
                  className="press flex w-full items-center justify-between"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="relative h-12 w-12 shrink-0">
                      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                        <circle
                          cx="50"
                          cy="50"
                          r="42"
                          fill="none"
                          stroke="var(--c-line)"
                          strokeWidth="8"
                        />
                        <circle
                          cx="50"
                          cy="50"
                          r="42"
                          fill="none"
                          stroke={ringColor}
                          strokeWidth="8"
                          strokeLinecap="round"
                          strokeDasharray={RING_C}
                          strokeDashoffset={
                            RING_C * (1 - Math.max(0, Math.min(100, data.skor.toplam)) / 100)
                          }
                        />
                      </svg>
                      <span className="text-fg absolute inset-0 grid place-items-center text-sm font-bold">
                        {Math.round(data.skor.toplam)}
                      </span>
                    </span>
                    <span className="text-left">
                      <span className="text-fg block text-sm font-semibold">Kelepir analizi</span>
                      <span className="text-fg-faint block text-[11px]">Yalnız sen görüyorsun</span>
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    {band?.band && (
                      <span
                        className="rounded-full px-2.5 py-1 text-[11px] font-semibold text-white"
                        style={{ background: BAND_VARS[band.band] ?? 'var(--c-brand)' }}
                      >
                        {band.label}
                      </span>
                    )}
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={`text-fg-dim transition-transform ${showAnaliz ? 'rotate-180' : ''}`}
                    >
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </span>
                </button>

                {showAnaliz && (
                  <div className="mt-5 space-y-5">
                    {/* Pilarlar (dinamik) */}
                    <div className="space-y-3.5">
                      {Object.entries(data.skor.bilesenler).map(([key, b]) => {
                        const w = Math.max(0, Math.min(100, b.deger));
                        return (
                          <div key={key}>
                            <div className="mb-1.5 flex items-baseline justify-between text-sm">
                              <span className="text-fg-dim font-medium">{pillarLabel(key)}</span>
                              <span className="text-fg font-mono text-xs">
                                {Math.round(b.deger)}
                              </span>
                            </div>
                            <span className="bg-panel-soft block h-1.5 overflow-hidden rounded-full">
                              <span
                                className="block h-full rounded-full"
                                style={{ width: `${w}%`, background: pillarColor(key) }}
                              />
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {data.skor.uyarilar && data.skor.uyarilar.length > 0 && (
                      <ul className="text-fg-dim space-y-2 text-sm">
                        {data.skor.uyarilar.map((u, i) => (
                          <li key={i} className="flex gap-2.5">
                            <span style={{ color: 'var(--pahali)' }}>•</span>
                            {u}
                          </li>
                        ))}
                      </ul>
                    )}

                    <IlanChat context={chatContext} />
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </div>

      <BottomNav />
    </main>
  );
}

function Carousel({ media, title }: { media: MediaItem[]; title: string }): ReactElement {
  const [idx, setIdx] = useState(0);
  const items = media.filter((m) => m.url);

  if (items.length === 0) {
    return (
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-[radial-gradient(circle_at_30%_20%,#2a2342,#0f172a_70%)]">
        <div className="absolute inset-0 grid place-items-center">
          <span className="text-fg-faint text-sm">Görsel yok</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        className="flex aspect-[4/5] w-full snap-x snap-mandatory overflow-x-auto"
        onScroll={(e) => {
          const el = e.currentTarget;
          setIdx(Math.round(el.scrollLeft / el.clientWidth));
        }}
      >
        {items.map((m) => (
          <div key={m.id} className="relative h-full w-full shrink-0 snap-center bg-black">
            {m.type === 'video' ? (
              <video
                src={m.url ?? undefined}
                poster={m.poster ?? undefined}
                className="h-full w-full object-contain"
                controls
                muted
                loop
                playsInline
                preload="metadata"
              />
            ) : (
              <img src={m.url ?? ''} alt={title} className="h-full w-full object-cover" />
            )}
            {m.is_ai_generated && (
              <span className="glass border-line text-fg-dim absolute left-3 top-3 rounded-full border px-2.5 py-1 text-[11px]">
                Yapay zeka · temsilî
              </span>
            )}
          </div>
        ))}
      </div>
      {items.length > 1 && (
        <div className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
          {items.map((m, i) => (
            <span
              key={m.id}
              className={`h-1.5 rounded-full transition-all ${i === idx ? 'bg-fg w-4' : 'w-1.5 bg-white/40'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Icon({
  name,
  filled,
  size = 22,
}: {
  name: string;
  filled?: boolean;
  size?: number;
}): ReactElement {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: filled ? 'currentColor' : 'none',
    stroke: 'currentColor',
    strokeWidth: 1.9,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  if (name === 'heart')
    return (
      <svg {...common}>
        <path d="M12 20s-7-4.4-9.3-8.7C1.3 8.5 2.7 5.2 6 5.2c2 0 3.2 1.2 4 2.6.8-1.4 2-2.6 4-2.6 3.3 0 4.7 3.3 3.3 6.1C19 15.6 12 20 12 20Z" />
      </svg>
    );
  return <svg {...common} />;
}
