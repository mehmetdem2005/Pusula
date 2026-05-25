'use client';

import { useEffect, useState, type ReactElement } from 'react';
import { addFavorite, addToList, createList, getLists, type ListSummary } from '../lib/lists';

/**
 * "Kaydet" alt sayfası (bottom sheet) — Favorilere ya da seçilen listeye ekler; yeni liste açar.
 * Feed (kesfet) ve ilan detayında ortak kullanılır.
 */
export function SaveSheet({
  listingId,
  open,
  onClose,
  onSaved,
}: {
  listingId: string;
  open: boolean;
  onClose: () => void;
  onSaved?: (label: string) => void;
}): ReactElement | null {
  const [lists, setLists] = useState<ListSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setDone(null);
    setError(null);
    setLoading(true);
    getLists()
      .then(setLists)
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function toFavorite(): Promise<void> {
    if (busy) return;
    setBusy('fav');
    setError(null);
    try {
      await addFavorite(listingId);
      finish('Favorilere kaydedildi');
    } catch (e) {
      setError((e as Error).message);
      setBusy(null);
    }
  }

  async function toList(l: ListSummary): Promise<void> {
    if (busy) return;
    setBusy(l.id);
    setError(null);
    try {
      if (l.is_default) await addFavorite(listingId);
      else await addToList(l.id, listingId);
      finish(`${l.name} listesine kaydedildi`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(null);
    }
  }

  async function createAndAdd(): Promise<void> {
    const name = newName.trim();
    if (!name || busy) return;
    setBusy('new');
    setError(null);
    try {
      const created = await createList(name);
      await addToList(created.id, listingId);
      finish(`${name} listesine kaydedildi`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(null);
    }
  }

  function finish(label: string): void {
    setDone(label);
    onSaved?.(label);
    setTimeout(onClose, 700);
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Kaydet"
    >
      <button
        type="button"
        aria-label="Kapat"
        onClick={onClose}
        className="absolute inset-0 bg-black/60"
      />
      <div className="bg-panel border-line relative z-10 w-full max-w-md rounded-t-3xl border-t p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <div className="bg-panel-soft mx-auto mb-3 h-1 w-10 rounded-full" />
        <div className="text-fg mb-3 text-center text-sm font-semibold">Kaydet</div>

        {done ? (
          <div className="py-8 text-center">
            <div className="mb-2 text-3xl" aria-hidden>
              ✓
            </div>
            <p className="text-fg text-sm font-medium">{done}</p>
          </div>
        ) : (
          <>
            {error && <p className="text-danger mb-2 text-center text-sm">{error}</p>}
            <div className="max-h-[50vh] space-y-1.5 overflow-y-auto">
              <button
                type="button"
                onClick={() => void toFavorite()}
                disabled={!!busy}
                className="press bg-panel-soft flex w-full items-center gap-3 rounded-xl p-3 text-left disabled:opacity-60"
              >
                <span className="bg-night text-like grid h-10 w-10 shrink-0 place-items-center rounded-lg">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 20s-7-4.4-9.3-8.7C1.3 8.5 2.7 5.2 6 5.2c2 0 3.2 1.2 4 2.6.8-1.4 2-2.6 4-2.6 3.3 0 4.7 3.3 3.3 6.1C19 15.6 12 20 12 20Z" />
                  </svg>
                </span>
                <span className="text-fg flex-1 text-sm font-semibold">Favorilere kaydet</span>
                {busy === 'fav' && <span className="text-fg-faint text-xs">…</span>}
              </button>

              {loading ? (
                <div className="bg-panel-soft h-14 animate-pulse rounded-xl" />
              ) : (
                lists
                  .filter((l) => !l.is_default)
                  .map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => void toList(l)}
                      disabled={!!busy}
                      className="press bg-panel-soft flex w-full items-center gap-3 rounded-xl p-3 text-left disabled:opacity-60"
                    >
                      <span className="bg-night text-fg-dim grid h-10 w-10 shrink-0 place-items-center rounded-lg">
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
                      </span>
                      <span className="text-fg flex-1 text-sm font-semibold">{l.name}</span>
                      <span className="text-fg-faint text-xs">{l.item_count}</span>
                    </button>
                  ))
              )}
            </div>

            <div className="border-line mt-3 border-t pt-3">
              {creating ? (
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && void createAndAdd()}
                    maxLength={80}
                    placeholder="Yeni liste adı"
                    className="border-line bg-panel-soft text-fg placeholder:text-fg-faint focus:border-brand flex-1 rounded-lg border px-3 py-2 text-sm outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => void createAndAdd()}
                    disabled={!!busy || !newName.trim()}
                    className="press bg-brand rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    Ekle
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setCreating(true)}
                  className="press text-brand flex w-full items-center justify-center gap-2 py-2 text-sm font-semibold"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  Yeni liste oluştur
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
