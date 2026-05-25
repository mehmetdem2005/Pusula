'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState, type ReactElement } from 'react';
import { authedFetch } from '../../lib/api';
import { TRY } from '../../lib/score-ui';
import { BottomNav } from '../../components/shell/BottomNav';

interface MyListing {
  id: string;
  baslik: string;
  fiyat_tl: number;
  kategori: string;
  status: string;
  visibility: string;
  il: string | null;
  ilce: string | null;
  media_count: number;
}

const STATUS: Record<string, { label: string; color: string }> = {
  draft: { label: 'Taslak', color: 'var(--piyasa)' },
  processing: { label: 'İşleniyor', color: 'var(--p-konum)' },
  published: { label: 'Yayında', color: 'var(--kelepir)' },
  paused: { label: 'Duraklatıldı', color: 'var(--pahali)' },
  removed: { label: 'Kaldırıldı', color: 'var(--asiri)' },
  rejected: { label: 'Reddedildi', color: 'var(--asiri)' },
};
const KATEGORI: Record<string, string> = { konut: 'Konut', arsa: 'Arsa', oto: 'Araç' };

export default function IlanlarimPage(): ReactElement {
  const router = useRouter();
  const [items, setItems] = useState<MyListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    authedFetch<MyListing[]>('/v1/ilanlar')
      .then((d) => {
        setItems(d);
        setError(null);
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => load(), [load]);

  async function publish(id: string): Promise<void> {
    if (busy) return;
    setBusy(id);
    setError(null);
    try {
      await authedFetch(`/v1/ilanlar/${id}/publish`, {
        method: 'POST',
        body: JSON.stringify({ tos_attested: true }),
      });
      setItems((p) =>
        p.map((i) => (i.id === id ? { ...i, status: 'published', visibility: 'public' } : i)),
      );
    } catch (e) {
      setError((e as Error).message.replace(/^\d+:\s*/, ''));
    } finally {
      setBusy(null);
    }
  }

  async function unpublish(id: string): Promise<void> {
    if (busy) return;
    setBusy(id);
    setError(null);
    try {
      await authedFetch(`/v1/ilanlar/${id}/unpublish`, { method: 'POST' });
      setItems((p) =>
        p.map((i) => (i.id === id ? { ...i, status: 'paused', visibility: 'private' } : i)),
      );
    } catch (e) {
      setError((e as Error).message.replace(/^\d+:\s*/, ''));
    } finally {
      setBusy(null);
    }
  }

  const kpis: [string, number][] = [
    ['Toplam', items.length],
    ['Yayında', items.filter((i) => i.status === 'published').length],
    ['Taslak', items.filter((i) => i.status === 'draft').length],
    ['Duraklatılan', items.filter((i) => i.status === 'paused').length],
  ];

  return (
    <main className="bg-night font-body text-fg min-h-[100dvh]">
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
        <span className="text-fg text-sm font-semibold">İlanlarım</span>
        <Link
          href="/ilan/yeni"
          aria-label="Yeni ilan"
          className="press bg-brand flex h-9 w-9 items-center justify-center rounded-full text-white"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
        </Link>
      </header>

      <div className="mx-auto w-full max-w-2xl px-4 pb-28 pt-4">
        {/* KPI */}
        <div className="grid grid-cols-4 gap-2">
          {kpis.map(([label, val]) => (
            <div key={label} className="border-line bg-panel rounded-xl border p-3 text-center">
              <div className="font-display text-fg text-2xl font-bold">{loading ? '—' : val}</div>
              <div className="text-fg-faint mt-0.5 text-[11px]">{label}</div>
            </div>
          ))}
        </div>

        {error && (
          <div className="border-danger text-danger mt-4 rounded-xl border p-3 text-sm">
            {error}
          </div>
        )}

        <div className="mt-4 space-y-2">
          {loading ? (
            [0, 1, 2].map((i) => <div key={i} className="bg-panel h-20 animate-pulse rounded-xl" />)
          ) : items.length === 0 ? (
            <div className="py-16 text-center">
              <p className="font-display text-fg text-xl font-semibold">Henüz ilanın yok</p>
              <p className="text-fg-dim mt-1 text-sm">İlk ilanını paylaş, burada yönet.</p>
              <Link
                href="/ilan/yeni"
                className="press brand-glow bg-brand mt-5 inline-block rounded-full px-6 py-2.5 font-semibold text-white"
              >
                İlan paylaş
              </Link>
            </div>
          ) : (
            items.map((it) => {
              const st = STATUS[it.status] ?? { label: it.status, color: 'var(--c-panel-soft)' };
              const loc = [it.il, it.ilce].filter(Boolean).join(' · ');
              return (
                <div key={it.id} className="border-line bg-panel rounded-xl border p-3">
                  <div className="flex items-start gap-3">
                    <Link href={`/ilan/${it.id}`} className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
                          style={{ background: st.color }}
                        >
                          {st.label}
                        </span>
                        <span className="text-fg-faint text-[10px] uppercase tracking-wide">
                          {KATEGORI[it.kategori] ?? it.kategori}
                        </span>
                      </div>
                      <div className="text-fg mt-1.5 line-clamp-1 text-sm font-medium">
                        {it.baslik}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2">
                        <span className="font-display text-fg text-sm font-bold">
                          {TRY.format(it.fiyat_tl)}
                        </span>
                        {loc && <span className="text-fg-faint text-xs">{loc}</span>}
                        <span className="text-fg-faint text-xs">· {it.media_count} medya</span>
                      </div>
                    </Link>
                  </div>
                  <div className="border-line mt-3 flex gap-2 border-t pt-3">
                    {it.status === 'published' ? (
                      <button
                        type="button"
                        onClick={() => void unpublish(it.id)}
                        disabled={busy === it.id}
                        className="press border-line text-fg flex-1 rounded-lg border py-2 text-xs font-semibold disabled:opacity-50"
                      >
                        {busy === it.id ? '…' : 'Yayından kaldır'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void publish(it.id)}
                        disabled={busy === it.id}
                        className="press bg-brand flex-1 rounded-lg py-2 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        {busy === it.id ? '…' : 'Yayınla'}
                      </button>
                    )}
                    <Link
                      href={`/ilan/${it.id}`}
                      className="press border-line text-fg-dim flex-1 rounded-lg border py-2 text-center text-xs font-semibold"
                    >
                      Görüntüle
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <BottomNav />
    </main>
  );
}
