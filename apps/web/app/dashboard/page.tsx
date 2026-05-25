'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';
import { authedFetch } from '../../lib/api';
import { TRY } from '../../lib/score-ui';
import { BottomNav } from '../../components/shell/BottomNav';

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
  media: FeedMedia[];
}

const KATEGORILER: { key: string; label: string }[] = [
  { key: '', label: 'Tümü' },
  { key: 'konut', label: 'Konut' },
  { key: 'arsa', label: 'Arsa' },
  { key: 'oto', label: 'Araç' },
];

export default function KesfetPage(): ReactElement {
  const [items, setItems] = useState<FeedCard[]>([]);
  const [cursor, setCursor] = useState<number | null>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [kat, setKat] = useState('');

  const loadMore = useCallback(async () => {
    if (loading || cursor === null) return;
    setLoading(true);
    setError(null);
    try {
      const r = await authedFetch<{ items: FeedCard[]; next_cursor: number | null }>(
        `/v1/feed?cursor=${cursor}&limit=12`,
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

  const filtered = useMemo(() => {
    const needle = q.trim().toLocaleLowerCase('tr');
    return items.filter((it) => {
      if (kat && it.kategori !== kat) return false;
      if (!needle) return true;
      const hay = [it.baslik, it.il, it.ilce, it.mahalle]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('tr');
      return hay.includes(needle);
    });
  }, [items, q, kat]);

  return (
    <main className="bg-night font-body text-fg min-h-[100dvh]">
      <header className="glass border-line sticky top-0 z-30 border-b px-3 py-2.5">
        <div className="flex items-center gap-2">
          <div className="bg-panel flex flex-1 items-center gap-2 rounded-xl px-3 py-2">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-fg-faint"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Ara — başlık, il, ilçe…"
              className="text-fg placeholder:text-fg-faint w-full bg-transparent text-sm outline-none"
            />
            {q && (
              <button
                type="button"
                onClick={() => setQ('')}
                aria-label="Temizle"
                className="text-fg-faint"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
        <div className="mt-2.5 flex gap-1.5 overflow-x-auto">
          {KATEGORILER.map((k) => (
            <button
              key={k.key}
              type="button"
              onClick={() => setKat(k.key)}
              className={`press shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                kat === k.key ? 'bg-fg text-night' : 'bg-panel text-fg-dim'
              }`}
            >
              {k.label}
            </button>
          ))}
        </div>
      </header>

      <div className="mx-auto w-full max-w-2xl px-1 pb-28 pt-1">
        {error && (
          <div className="border-danger text-danger mx-2 mt-3 rounded-xl border p-3 text-sm">
            Keşfet yüklenemedi: {error}
          </div>
        )}

        {items.length === 0 && loading ? (
          <div className="grid grid-cols-3 gap-1">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="bg-panel aspect-square animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <p className="font-display text-fg text-xl font-semibold">
              {q || kat ? 'Sonuç yok' : 'Henüz ilan yok'}
            </p>
            <p className="text-fg-dim mt-1 text-sm">
              {q || kat ? 'Aramayı değiştir.' : 'İlk ilanı sen paylaş.'}
            </p>
            {!q && !kat && (
              <Link
                href="/ilan/yeni"
                className="press brand-glow bg-brand mt-5 inline-block rounded-full px-6 py-2.5 font-semibold text-white"
              >
                İlan paylaş
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1">
            {filtered.map((it) => {
              const primary = it.media.find((m) => m.type === 'video') ?? it.media[0] ?? null;
              return (
                <Link
                  key={it.id}
                  href={`/ilan/${it.id}`}
                  className="press from-panel-soft to-night group relative flex aspect-square flex-col justify-end overflow-hidden bg-gradient-to-br"
                >
                  {primary?.url ? (
                    primary.type === 'video' ? (
                      <video
                        src={primary.url}
                        className="absolute inset-0 h-full w-full object-cover"
                        muted
                        playsInline
                        preload="metadata"
                      />
                    ) : (
                      <img
                        src={primary.url}
                        alt={it.baslik}
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    )
                  ) : null}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 to-transparent" />
                  {primary?.type === 'video' && (
                    <span className="absolute right-1.5 top-1.5 text-white drop-shadow">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </span>
                  )}
                  <div className="relative p-1.5">
                    <div className="line-clamp-1 text-[10px] font-medium text-white/90">
                      {it.baslik}
                    </div>
                    <div className="font-display text-[11px] font-bold text-white">
                      {TRY.format(it.fiyat_tl)}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {cursor !== null && items.length > 0 && (
          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={() => void loadMore()}
              disabled={loading}
              className="press text-fg rounded-full bg-white/10 px-6 py-2.5 text-sm font-medium"
            >
              {loading ? 'Yükleniyor…' : 'Daha fazla'}
            </button>
          </div>
        )}
      </div>

      <BottomNav />
    </main>
  );
}
