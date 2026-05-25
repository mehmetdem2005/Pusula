'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState, type ReactElement } from 'react';
import { createList, deleteList, getLists, type ListSummary } from '../../lib/lists';
import { BottomNav } from '../../components/shell/BottomNav';

export default function ListelerPage(): ReactElement {
  const router = useRouter();
  const [lists, setLists] = useState<ListSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    getLists()
      .then((d) => {
        setLists(d);
        setError(null);
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => load(), [load]);

  async function submitNew(): Promise<void> {
    const name = newName.trim();
    if (!name || busy) return;
    setBusy(true);
    try {
      await createList(name);
      setNewName('');
      setCreating(false);
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string): Promise<void> {
    if (busy) return;
    setBusy(true);
    try {
      await deleteList(id);
      setLists((prev) => prev.filter((l) => l.id !== id));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

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
        <span className="text-fg text-sm font-semibold">Kayıtlılar</span>
        <button
          type="button"
          onClick={() => setCreating((c) => !c)}
          aria-label="Yeni liste"
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
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </header>

      <div className="mx-auto w-full max-w-xl px-4 pb-28 pt-4">
        {creating && (
          <div className="border-line bg-panel mb-4 flex items-center gap-2 rounded-xl border p-2">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void submitNew()}
              maxLength={80}
              placeholder="Liste adı"
              className="text-fg placeholder:text-fg-faint flex-1 bg-transparent px-2 py-1.5 text-sm outline-none"
            />
            <button
              type="button"
              onClick={() => void submitNew()}
              disabled={busy || !newName.trim()}
              className="press bg-brand rounded-lg px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              Oluştur
            </button>
          </div>
        )}

        {error && (
          <div className="border-danger text-danger mb-4 rounded-xl border p-3 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="bg-panel h-16 animate-pulse rounded-xl" />
            ))}
          </div>
        ) : (
          <ul className="space-y-2">
            {lists.map((l) => (
              <li
                key={l.id}
                className="border-line bg-panel press flex items-center gap-3 rounded-xl border p-3"
              >
                <Link href={`/listeler/${l.id}`} className="flex flex-1 items-center gap-3">
                  <span className="bg-panel-soft text-fg-dim grid h-11 w-11 shrink-0 place-items-center rounded-lg">
                    {l.is_default ? (
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="text-like"
                      >
                        <path d="M12 20s-7-4.4-9.3-8.7C1.3 8.5 2.7 5.2 6 5.2c2 0 3.2 1.2 4 2.6.8-1.4 2-2.6 4-2.6 3.3 0 4.7 3.3 3.3 6.1C19 15.6 12 20 12 20Z" />
                      </svg>
                    ) : (
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M6 4h12v17l-6-4-6 4V4Z" />
                      </svg>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="text-fg block truncate text-sm font-semibold">{l.name}</span>
                    <span className="text-fg-faint block text-xs">{l.item_count} ilan</span>
                  </span>
                </Link>
                {!l.is_default && (
                  <button
                    type="button"
                    onClick={() => void remove(l.id)}
                    disabled={busy}
                    aria-label="Listeyi sil"
                    className="press text-fg-faint hover:text-danger flex h-9 w-9 items-center justify-center rounded-full"
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 6h18M8 6V4h8v2m-9 0v14h10V6" />
                    </svg>
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        {!loading && lists.length === 0 && !error && (
          <div className="py-16 text-center">
            <p className="font-display text-fg text-xl font-semibold">Henüz liste yok</p>
            <p className="text-fg-dim mt-1 text-sm">
              Akışta beğendiğin ilanları kaydet, burada toplansın.
            </p>
          </div>
        )}
      </div>

      <BottomNav />
    </main>
  );
}
