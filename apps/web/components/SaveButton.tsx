'use client';

import { useState, type ReactElement } from 'react';
import { SaveSheet } from './SaveSheet';

/** Kaydet — Favorilere ya da seçilen listeye eklemek için alt sayfayı açar. */
export function SaveButton({
  listingId,
  className = '',
  onSaved,
}: {
  listingId: string;
  className?: string;
  onSaved?: () => void;
}): ReactElement {
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-pressed={saved}
        className={className}
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill={saved ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 4h12v17l-6-4-6 4V4Z" />
        </svg>
        {saved ? 'Kaydedildi' : 'Kaydet'}
      </button>
      <SaveSheet
        listingId={listingId}
        open={open}
        onClose={() => setOpen(false)}
        onSaved={() => {
          setSaved(true);
          onSaved?.();
        }}
      />
    </>
  );
}
