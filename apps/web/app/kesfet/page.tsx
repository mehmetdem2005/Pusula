'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
import { authedFetch } from '../../lib/api';
import { TRY } from '../../lib/score-ui';

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
    }).catch(() => {
      /* yut — kayıp tolere edilir */
    });
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

  // İlk yükleme.
  useEffect(() => {
    void loadMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Periyodik + sayfa kapanışında event flush.
  useEffect(() => {
    const t = setInterval(flush, 5000);
    const onHide = () => {
      // Aktif kartın dwell'ini kapat.
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

  // Görünürlük gözlemcisi — aktif kart + view/dwell.
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
            const id = (entry.target as HTMLElement).dataset.id;
            const pos = Number((entry.target as HTMLElement).dataset.pos ?? '0');
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
              // autoplay yalnız aktif video
              const v = (entry.target as HTMLElement).querySelector('video');
              if (v) void v.play().catch(() => undefined);
            }
          } else {
            const v = (entry.target as HTMLElement).querySelector('video');
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

  function save(card: FeedCard) {
    queue({ listing_id: card.id, event_type: 'save' }, true);
  }

  return (
    <main className="bg-navy-deep text-cream relative h-[100dvh] w-full overflow-hidden">
      {/* Üst ince overlay */}
      <div className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between px-4 py-3">
        <Link href="/" className="text-cream font-serif text-lg">
          Pusula
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <Link
            href="/ilan/yeni"
            className="bg-gold text-navy rounded-full px-3 py-1 font-semibold"
          >
            + İlan
          </Link>
          <Link href="/dashboard" className="text-cream/80 hover:text-cream">
            Panel
          </Link>
        </div>
      </div>

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
              {/* Medya */}
              {primary?.url ? (
                primary.type === 'video' ? (
                  <video
                    src={primary.url}
                    className="absolute inset-0 h-full w-full object-cover"
                    muted
                    loop
                    playsInline
                    preload="metadata"
                  />
                ) : (
                  <img
                    src={primary.url}
                    alt={card.baslik}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                )
              ) : (
                <div className="from-navy-soft to-navy-deep absolute inset-0 bg-gradient-to-br" />
              )}
              {/* Karartma */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30" />

              {primary?.is_ai_generated && (
                <span className="text-cream/90 absolute left-4 top-16 z-10 rounded-full bg-black/50 px-2 py-1 text-[11px]">
                  Yapay zeka ile oluşturuldu — temsilî
                </span>
              )}

              {/* Sağ aksiyon rayı */}
              <div className="absolute bottom-28 right-3 z-10 flex flex-col items-center gap-5">
                <button
                  type="button"
                  onClick={() => toggleLike(card)}
                  className="text-cream flex flex-col items-center"
                  aria-pressed={card.liked_by_me}
                >
                  <span className={`text-3xl ${card.liked_by_me ? 'text-gold-hi' : ''}`}>♥</span>
                  <span className="mono text-xs">{card.like_count}</span>
                </button>
                <button
                  type="button"
                  onClick={() => save(card)}
                  className="text-cream flex flex-col items-center"
                >
                  <span className="text-3xl">☆</span>
                  <span className="text-xs">Kaydet</span>
                </button>
                <Link href={`/ilan/${card.id}`} className="text-cream flex flex-col items-center">
                  <span className="text-3xl">ⓘ</span>
                  <span className="text-xs">Detay</span>
                </Link>
              </div>

              {/* Sol-alt bilgi */}
              <div className="absolute bottom-10 left-4 right-20 z-10">
                <div className="text-cream/80 text-sm">@{card.owner.handle ?? 'kullanıcı'}</div>
                <h2 className="text-cream mt-1 font-serif text-2xl leading-tight">{card.baslik}</h2>
                {loc && <div className="text-cream/80 mt-1 text-sm">{loc}</div>}
                <div className="mt-2 flex items-center gap-3">
                  <span className="text-gold-hi font-serif text-xl">
                    {TRY.format(card.fiyat_tl)}
                  </span>
                  {card.net_m2 && <span className="text-cream/80 text-sm">{card.net_m2} m²</span>}
                  {card.oda_sayisi && (
                    <span className="text-cream/80 text-sm">{card.oda_sayisi}</span>
                  )}
                </div>
              </div>
            </section>
          );
        })}

        {/* Yükle/durum */}
        {cursor !== null && items.length > 0 && (
          <section className="flex h-[40vh] snap-start items-center justify-center">
            <button onClick={() => void loadMore()} disabled={loading} className="btn btn-gold">
              {loading ? 'Yükleniyor…' : 'Daha fazla'}
            </button>
          </section>
        )}

        {!loading && items.length === 0 && (
          <section className="flex h-[100dvh] snap-start flex-col items-center justify-center gap-4 px-6 text-center">
            <p className="text-cream font-serif text-2xl">Henüz ilan yok</p>
            <p className="text-cream/70 max-w-sm text-sm">
              İlk ilanı sen paylaş — fotoğraf/video ekle, herkes keşfetsin.
            </p>
            <Link href="/ilan/yeni" className="btn btn-gold">
              + İlan Ekle
            </Link>
          </section>
        )}

        {error && (
          <section className="text-cream/80 flex h-[40vh] snap-start items-center justify-center px-6 text-center text-sm">
            Feed yüklenemedi: {error}
          </section>
        )}
      </div>
    </main>
  );
}
