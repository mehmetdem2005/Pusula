'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import type { ReactElement } from 'react';
import { useApi } from '../../../lib/api';
import { TRY } from '../../../lib/score-ui';
import { BottomNav } from '../../../components/shell/BottomNav';

interface ProfileListing {
  id: string;
  baslik: string;
  fiyat_tl: number;
  kategori: string;
  il: string | null;
  ilce: string | null;
  mahalle: string | null;
}
interface PublicProfile {
  handle: string | null;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
  listings: ProfileListing[];
}

export default function PublicProfilePage(): ReactElement {
  const params = useParams();
  const router = useRouter();
  const handle = typeof params.handle === 'string' ? params.handle : (params.handle?.[0] ?? '');
  const { data, loading, error } = useApi<PublicProfile>(handle ? `/v1/profiles/${handle}` : null);

  const name = data?.display_name || data?.handle || 'Kullanıcı';
  const initial = (name || 'K').trim()[0]?.toUpperCase() ?? 'K';

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
        <span className="text-fg text-sm font-semibold">@{handle}</span>
        <span className="h-9 w-9" />
      </header>

      <div className="mx-auto w-full max-w-2xl px-4 pb-28 pt-5">
        {loading && (
          <div className="flex items-center gap-5">
            <div className="bg-panel h-20 w-20 animate-pulse rounded-full" />
            <div className="bg-panel h-12 flex-1 animate-pulse rounded-xl" />
          </div>
        )}

        {error && (
          <div className="py-16 text-center">
            <p className="font-display text-fg text-xl font-semibold">Profil bulunamadı</p>
            <p className="text-fg-dim mt-1 text-sm">Bu kullanıcı adı yok ya da profil gizli.</p>
            <Link
              href="/kesfet"
              className="press bg-brand mt-5 inline-block rounded-full px-6 py-2.5 font-semibold text-white"
            >
              Akışa dön
            </Link>
          </div>
        )}

        {data && (
          <>
            <div className="flex items-center gap-5">
              {data.avatar_url ? (
                <img
                  src={data.avatar_url}
                  alt={name}
                  className="ring-line h-20 w-20 rounded-full object-cover ring-2"
                />
              ) : (
                <div className="from-panel-soft to-panel text-fg ring-line grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br text-3xl font-semibold ring-2">
                  {initial}
                </div>
              )}
              <div className="flex flex-1 justify-around text-center">
                <Stat value={data.listings.length} label="İlan" />
                <Stat value={0} label="Takipçi" />
                <Stat value={0} label="Takip" />
              </div>
            </div>

            <div className="mt-4">
              <div className="font-semibold">{name}</div>
              {data.handle && <div className="text-fg-dim text-sm">@{data.handle}</div>}
              {data.bio && <p className="text-fg-dim mt-2 text-sm leading-relaxed">{data.bio}</p>}
            </div>

            <div className="border-line mt-6 border-t pt-4">
              {data.listings.length === 0 ? (
                <div className="py-16 text-center">
                  <p className="font-display text-xl font-semibold">Henüz ilan yok</p>
                  <p className="text-fg-dim mt-1 text-sm">Bu kullanıcı henüz ilan paylaşmamış.</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-1">
                  {data.listings.map((ilan) => (
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
          </>
        )}
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
