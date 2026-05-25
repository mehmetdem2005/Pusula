'use client';

import { useState, type ReactElement } from 'react';
import { authedFetch } from '../lib/api';

/** İlanı favorilere kaydet (varsayılan liste). Feed/kart/detayda ortak. */
export function SaveButton({
  listingId,
  className = '',
  onSaved,
}: {
  listingId: string;
  className?: string;
  onSaved?: () => void;
}): ReactElement {
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (saved || busy) return;
    setBusy(true);
    try {
      await authedFetch('/v1/lists/favorite', {
        method: 'POST',
        body: JSON.stringify({ ilan_id: listingId }),
      });
      setSaved(true);
      onSaved?.();
    } catch {
      /* sessizce geç */
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void save()}
      disabled={busy}
      aria-pressed={saved}
      className={className}
    >
      {saved ? '★ Kaydedildi' : '☆ Kaydet'}
    </button>
  );
}
