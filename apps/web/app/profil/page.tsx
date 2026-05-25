'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactElement } from 'react';
import { useApi } from '../../lib/api';
import { TRY } from '../../lib/score-ui';
import { getSupabaseBrowser } from '../../lib/supabase';
import { BottomNav } from '../../components/shell/BottomNav';

interface IlanCard {
  id: string;
  baslik: string;
  fiyat_tl: number;
  il: string | null;
  ilce: string | null;
  net_m2: number | null;
  oda_sayisi: string | null;
}

export default function ProfilPage(): ReactElement {
  const { data, loading } = useApi<IlanCard[]>('/v1/ilanlar');
  const ilanlar = data ?? [];
  const [name, setName] = useState('');
  const [handle, setHandle] = useState<string | null>(null);

  useEffect(() => {
    getSupabaseBrowser()
      .auth.getUser()
      .then(({ data: u }) => {
        const meta = (u.user?.user_metadata ?? {}) as { display_name?: string; handle?: string };
        setName(meta.display_name || u.user?.email?.split('@')[0] || 'Kullanıcı');
        setHandle(meta.handle ?? null);
      })
      .catch(() => undefined);
  }, []);

  const initial = (name || 'K').trim()[0]?.toUpperCase() ?? 'K';

  return (
    <main className="bg-night font-body text-fg min-h-[100dvh]">
      <header className="glass border-line sticky top-0 z-30 flex items-center justify-between border-b px-4 py-3">
        <span className="font-display text-lg font-bold">@{handle ?? name}</span>
        <div className="flex items-center gap-1.5">
          <Link
            href="/listeler"
            aria-label="Kayıtlılar"
            className="press text-fg flex h-9 w-9 items-center justify-center rounded-full bg-white/5"
          >
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
          </Link>
          <Link
            href="/settings"
            aria-label="Ayarlar"
            className="press text-fg flex h-9 w-9 items-center justify-center rounded-full bg-white/5"
          >
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
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H10a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V10a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
            </svg>
          </Link>
        </div>
      </header>

      <div className="mx-auto w-full max-w-2xl px-4 pb-28 pt-5">
        {/* Profil başlığı */}
        <div className="flex items-center gap-5">
          <div className="from-panel-soft to-panel text-fg ring-line grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br text-3xl font-semibold ring-2">
            {initial}
          </div>
          <div className="flex flex-1 justify-around text-center">
            <Stat value={ilanlar.length} label="İlan" />
            <Stat value={0} label="Takipçi" />
            <Stat value={0} label="Takip" />
          </div>
        </div>
        <div className="mt-4">
          <div className="font-semibold">{name}</div>
          {handle && <div className="text-fg-dim text-sm">@{handle}</div>}
        </div>
        <div className="mt-4 flex gap-2">
          <Link
            href="/profil/duzenle"
            className="press bg-panel text-fg flex-1 rounded-lg py-2 text-center text-sm font-semibold"
          >
            Profili düzenle
          </Link>
          <Link
            href="/ilan/yeni"
            className="press bg-brand rounded-lg px-4 py-2 text-center text-sm font-semibold text-white"
          >
            + İlan
          </Link>
        </div>

        {/* İlan grid'i */}
        <div className="border-line mt-6 border-t pt-4">
          {loading ? (
            <div className="grid grid-cols-3 gap-1">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="bg-panel aspect-square animate-pulse rounded-sm" />
              ))}
            </div>
          ) : ilanlar.length === 0 ? (
            <div className="py-16 text-center">
              <p className="font-display text-xl font-semibold">Henüz ilanın yok</p>
              <p className="text-fg-dim mt-1 text-sm">İlk ilanını paylaş, profilinde görünsün.</p>
              <Link
                href="/ilan/yeni"
                className="press bg-brand mt-5 inline-block rounded-full px-6 py-2.5 font-semibold text-white"
              >
                İlan paylaş
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1">
              {ilanlar.map((ilan) => (
                <Link
                  key={ilan.id}
                  href={`/ilan/${ilan.id}`}
                  className="press from-panel-soft to-night group relative flex aspect-square flex-col justify-end overflow-hidden rounded-sm bg-gradient-to-br p-2"
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  <div className="relative">
                    <div className="text-fg line-clamp-2 text-[11px] font-medium leading-tight">
                      {ilan.baslik}
                    </div>
                    <div className="mt-0.5 text-[11px] font-semibold text-white">
                      {TRY.format(ilan.fiyat_tl)}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </main>
  );
}

function Stat({ value, label }: { value: number; label: string }): ReactElement {
  return (
    <div>
      <div className="font-display text-lg font-bold">{value}</div>
      <div className="text-fg-dim text-xs">{label}</div>
    </div>
  );
}
