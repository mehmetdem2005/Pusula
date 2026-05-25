'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
import { authedFetch } from '../../lib/api';
import { TRY } from '../../lib/score-ui';
import { BottomNav } from '../../components/shell/BottomNav';
import { SaveSheet } from '../../components/SaveSheet';

interface FeedMedia {
  id: string;
  type: string;
  url: string | null;
  is_ai_generated: boolean;
}
interface FeedCard {
  id: string;
  baslik: string;
  fiyat_tl: number;
  kategori: string;
  il: string | null;
  ilce: string | null;
  mahalle: string | null;
  net_m2: number | null;
  oda_sayisi: string | null;
  owner: { id: string; handle: string | null; avatar_url: string | null };
  media: FeedMedia[];
  like_count: number;
  liked_by_me: boolean;
}
type EventType = 'view' | 'dwell' | 'like' | 'unlike' | 'save' | 'skip';
interface PendingEvent {
  listing_id: string;
  event_type: EventType;
  dwell_ms?: number;
  position?: number;
}

export default function KesfetPage(): ReactElement {
  const [items, setItems] = useState<FeedCard[]>([]);
  const [cursor, setCursor] = useState<number | null>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pendingRef = useRef<PendingEvent[]>([]);
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map());
  const activeRef = useRef<{ id: string; start: number; pos: number } | null>(null);
  const viewedRef = useRef<Set<string>>(new Set());

  const flush = useCallback(() => {
    const batch = pendingRef.current;
    if (batch.length === 0) return;
    pendingRef.current = [];
    void authedFetch('/v1/events', {
      method: 'POST',
      body: JSON.stringify({ events: batch }),
    }).catch(() => undefined);
  }, []);
  const queue = useCallback(
    (e: PendingEvent, immediate = false) => {
      pendingRef.current.push(e);
      if (immediate || pendingRef.current.length >= 8) flush();
    },
    [flush],
  );

  const loadMore = useCallback(async () => {
    if (loading || cursor === null) return;
    setLoading(true);
    setError(null);
    try {
      const r = await authedFetch<{ items: FeedCard[]; next_cursor: number | null }>(
        `/v1/feed?cursor=${cursor}&limit=8`,
      );
      setItems((prev) => [...prev, ...r.items]);
      setCursor(r.next_cursor);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [cursor, loading]);

  useEffect(() => {
    void loadMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setInterval(flush, 5000);
    const onHide = () => {
      const a = activeRef.current;
      if (a) queue({ listing_id: a.id, event_type: 'dwell', dwell_ms: Date.now() - a.start });
      flush();
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onHide);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onHide);
      onHide();
    };
  }, [flush, queue]);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const el = entry.target as HTMLElement;
          if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
            const id = el.dataset.id;
            const pos = Number(el.dataset.pos ?? '0');
            if (!id) continue;
            const prev = activeRef.current;
            if (prev && prev.id !== id) {
              queue({
                listing_id: prev.id,
                event_type: 'dwell',
                dwell_ms: Date.now() - prev.start,
              });
            }
            if (!prev || prev.id !== id) {
              activeRef.current = { id, start: Date.now(), pos };
              if (!viewedRef.current.has(id)) {
                viewedRef.current.add(id);
                queue({ listing_id: id, event_type: 'view', position: pos });
              }
              const v = el.querySelector('video');
              if (v) void v.play().catch(() => undefined);
            }
          } else {
            const v = el.querySelector('video');
            if (v) v.pause();
          }
        }
      },
      { threshold: [0, 0.6, 0.9] },
    );
    sectionRefs.current.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [items, queue]);

  function toggleLike(card: FeedCard) {
    const liked = !card.liked_by_me;
    setItems((prev) =>
      prev.map((c) =>
        c.id === card.id
          ? { ...c, liked_by_me: liked, like_count: c.like_count + (liked ? 1 : -1) }
          : c,
      ),
    );
    queue({ listing_id: card.id, event_type: liked ? 'like' : 'unlike' }, true);
  }
  const [saveFor, setSaveFor] = useState<string | null>(null);

  return (
    <main className="bg-night font-body text-fg fixed inset-0 overflow-hidden">
      {/* Glass üst bar */}
      <header className="glass border-line absolute inset-x-0 top-0 z-30 flex items-center justify-between border-b px-4 py-3">
        <Link href="/" className="font-display text-fg text-lg font-bold tracking-tight">
          Pusula
        </Link>
        <Link
          href="/dashboard"
          aria-label="Ara"
          className="press text-fg-dim flex h-9 w-9 items-center justify-center rounded-full bg-white/5"
        >
          <Icon name="search" />
        </Link>
      </header>

      <div className="h-full snap-y snap-mandatory overflow-y-scroll">
        {items.map((card, i) => {
          const primary = card.media.find((m) => m.type === 'video') ?? card.media[0] ?? null;
          const loc = [card.ilce, card.mahalle].filter(Boolean).join(' · ');
          return (
            <section
              key={card.id}
              data-id={card.id}
              data-pos={i}
              ref={(el) => {
                if (el) sectionRefs.current.set(card.id, el);
                else sectionRefs.current.delete(card.id);
              }}
              className="relative flex h-[100dvh] w-full snap-start items-center justify-center overflow-hidden"
            >
              {primary?.url ? (
                primary.type === 'video' ? (
                  <video
                    src={primary.url}
                    className="absolute inset-0 h-full w-full object-cover"
                    muted
                    loop
                    playsInline
                    preload="none"
                  />
                ) : (
                  <img
                    src={primary.url}
                    alt={card.baslik}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                )
              ) : (
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,#2a2342,#0f172a_70%)]" />
              )}
              {/* Sinematik karartma */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/40" />

              {primary?.is_ai_generated && (
                <span className="glass border-line text-fg-dim absolute left-4 top-20 z-10 rounded-full border px-2.5 py-1 text-[11px]">
                  Yapay zeka ile oluşturuldu · temsilî
                </span>
              )}

              {/* Sağ aksiyon rayı — IG/Reels: beyaz ikon + gölge, beğeni kırmızı */}
              <div className="absolute bottom-28 right-2.5 z-20 flex flex-col items-center gap-5">
                <RailButton
                  onClick={() => toggleLike(card)}
                  label={String(card.like_count)}
                  colorClass={card.liked_by_me ? 'text-like' : 'text-white'}
                >
                  <Icon name="heart" size={30} filled={card.liked_by_me} />
                </RailButton>
                <RailButton onClick={() => setSaveFor(card.id)} label="Kaydet">
                  <Icon name="bookmark" size={28} />
                </RailButton>
                <Link
                  href={`/ilan/${card.id}`}
                  className="press flex flex-col items-center gap-1 text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)]"
                >
                  <Icon name="info" size={28} />
                  <span className="text-[11px] font-medium">Detay</span>
                </Link>
              </div>

              {/* Sol-alt bilgi */}
              <div className="absolute bottom-28 left-4 right-20 z-10">
                <div className="flex items-center gap-2">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-white/15 text-xs text-white">
                    {(card.owner.handle ?? 'K')[0]?.toUpperCase()}
                  </span>
                  <span className="text-fg-dim text-sm">@{card.owner.handle ?? 'kullanıcı'}</span>
                  <span className="text-fg-dim rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide">
                    {card.kategori}
                  </span>
                </div>
                <h2 className="font-display text-fg mt-2 text-2xl font-semibold leading-tight">
                  {card.baslik}
                </h2>
                {loc && <div className="text-fg-dim mt-1 text-sm">{loc}</div>}
                <div className="mt-2 flex items-center gap-3">
                  <span className="font-display rounded-lg bg-black/45 px-3 py-1 text-lg font-bold text-white backdrop-blur-sm">
                    {TRY.format(card.fiyat_tl)}
                  </span>
                  {card.net_m2 && <span className="text-fg-dim text-sm">{card.net_m2} m²</span>}
                  {card.oda_sayisi && (
                    <span className="text-fg-dim text-sm">{card.oda_sayisi}</span>
                  )}
                </div>
              </div>
            </section>
          );
        })}

        {cursor !== null && items.length > 0 && (
          <section className="flex h-[40vh] snap-start items-center justify-center">
            <button
              onClick={() => void loadMore()}
              disabled={loading}
              className="press text-fg rounded-full bg-white/10 px-6 py-3 text-sm"
            >
              {loading ? 'Yükleniyor…' : 'Daha fazla'}
            </button>
          </section>
        )}

        {!loading && items.length === 0 && (
          <section className="flex h-[100dvh] snap-start flex-col items-center justify-center gap-4 px-8 text-center">
            <div className="orb h-24 w-24" aria-hidden />
            <p className="font-display text-fg text-2xl font-semibold">Akış henüz boş</p>
            <p className="text-fg-dim max-w-sm text-sm">
              İlk ilanı sen paylaş — fotoğraf/video ekle, herkes kaydırarak keşfetsin.
            </p>
            <Link
              href="/ilan/yeni"
              className="press brand-glow bg-brand rounded-full px-6 py-3 font-semibold text-white"
            >
              İlan paylaş
            </Link>
          </section>
        )}

        {error && (
          <section className="text-fg-dim flex h-[40vh] snap-start items-center justify-center px-6 text-center text-sm">
            Akış yüklenemedi: {error}
          </section>
        )}
      </div>

      {saveFor && (
        <SaveSheet
          listingId={saveFor}
          open={!!saveFor}
          onClose={() => setSaveFor(null)}
          onSaved={() => queue({ listing_id: saveFor, event_type: 'save' }, true)}
        />
      )}

      <BottomNav />
    </main>
  );
}

function RailButton({
  children,
  label,
  colorClass = 'text-white',
  onClick,
}: {
  children: ReactElement;
  label: string;
  colorClass?: string;
  onClick: () => void;
}): ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`press flex flex-col items-center gap-1 drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)] ${colorClass}`}
    >
      {children}
      <span className="text-[11px] font-medium text-white">{label}</span>
    </button>
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
  if (name === 'bookmark')
    return (
      <svg {...common}>
        <path d="M6 4h12v17l-6-4-6 4V4Z" />
      </svg>
    );
  if (name === 'info')
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5M12 8h.01" />
      </svg>
    );
  return (
    <svg {...common}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}
