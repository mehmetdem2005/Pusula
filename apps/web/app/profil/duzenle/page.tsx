'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type ReactElement } from 'react';
import { authedFetch } from '../../../lib/api';
import { getSupabaseBrowser } from '../../../lib/supabase';
import { BottomNav } from '../../../components/shell/BottomNav';

interface Meta {
  display_name?: string;
  handle?: string;
  bio?: string;
  avatar_url?: string;
  is_public?: boolean;
}

export default function ProfilDuzenlePage(): ReactElement {
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [handle, setHandle] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [uid, setUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSupabaseBrowser()
      .auth.getUser()
      .then(({ data }) => {
        const u = data.user;
        const meta = (u?.user_metadata ?? {}) as Meta;
        setUid(u?.id ?? null);
        setDisplayName(meta.display_name || u?.email?.split('@')[0] || '');
        setHandle(meta.handle ?? '');
        setBio(meta.bio ?? '');
        setAvatarUrl(meta.avatar_url ?? '');
        setIsPublic(meta.is_public !== false);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  async function save(): Promise<void> {
    if (busy) return;
    const h = handle.trim().toLowerCase();
    if (h && !/^[a-z0-9_]{3,30}$/.test(h)) {
      setError('Kullanıcı adı 3-30 karakter; yalnız küçük harf, rakam ve alt çizgi.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const sb = getSupabaseBrowser();
      // 1) Public profil alanları (handle benzersizlik kontrolü backend'de).
      const patch: Record<string, unknown> = { is_public: isPublic };
      if (h) patch.handle = h;
      if (bio.trim()) patch.bio = bio.trim();
      if (avatarUrl.trim()) patch.avatar_url = avatarUrl.trim();
      await authedFetch('/v1/profiles/me', { method: 'PATCH', body: JSON.stringify(patch) });

      // 2) display_name → users tablosu (feed/detay sahibi) + auth metadata (profil başlığı okur).
      if (uid) {
        await sb.from('users').update({ display_name: displayName.trim() }).eq('id', uid);
      }
      await sb.auth.updateUser({
        data: {
          display_name: displayName.trim(),
          handle: h,
          bio: bio.trim(),
          avatar_url: avatarUrl.trim(),
          is_public: isPublic,
        },
      });
      router.push('/profil');
    } catch (e) {
      const msg = (e as Error).message;
      setError(msg.includes('409') ? 'Bu kullanıcı adı alınmış.' : msg);
    } finally {
      setBusy(false);
    }
  }

  const inputCls =
    'mt-1 w-full rounded-lg border border-line bg-panel-soft px-3 py-2 text-fg placeholder:text-fg-faint focus:border-brand focus:outline-none';
  const initial = (displayName || handle || 'K').trim()[0]?.toUpperCase() ?? 'K';

  return (
    <main className="bg-night font-body text-fg min-h-[100dvh]">
      <header className="glass border-line sticky top-0 z-30 flex items-center justify-between border-b px-2 py-2.5">
        <Link
          href="/profil"
          aria-label="İptal"
          className="press text-fg-dim flex h-9 items-center px-2 text-sm font-medium"
        >
          İptal
        </Link>
        <span className="text-fg text-sm font-semibold">Profili düzenle</span>
        <button
          type="button"
          onClick={() => void save()}
          disabled={busy || loading}
          className="press text-brand flex h-9 items-center px-2 text-sm font-bold disabled:opacity-50"
        >
          {busy ? '…' : 'Kaydet'}
        </button>
      </header>

      <div className="mx-auto w-full max-w-md px-4 pb-28 pt-6">
        <div className="flex flex-col items-center">
          {avatarUrl.trim() ? (
            <img
              src={avatarUrl}
              alt="avatar"
              className="ring-line h-24 w-24 rounded-full object-cover ring-2"
            />
          ) : (
            <div className="from-panel-soft to-panel text-fg ring-line grid h-24 w-24 place-items-center rounded-full bg-gradient-to-br text-4xl font-semibold ring-2">
              {initial}
            </div>
          )}
          <p className="text-fg-faint mt-2 text-xs">
            Avatar yükleme yakında — şimdilik görsel bağlantısı yapıştırabilirsin.
          </p>
        </div>

        <div className="mt-6 space-y-4">
          <label className="block">
            <span className="text-fg-dim text-sm font-medium">İsim</span>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={80}
              className={inputCls}
              placeholder="Adın"
            />
          </label>

          <label className="block">
            <span className="text-fg-dim text-sm font-medium">Kullanıcı adı</span>
            <div className="relative mt-1">
              <span className="text-fg-faint pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm">
                @
              </span>
              <input
                value={handle}
                onChange={(e) => setHandle(e.target.value.toLowerCase())}
                maxLength={30}
                className={`${inputCls} mt-0 pl-7`}
                placeholder="kullanici_adi"
                autoCapitalize="none"
                autoCorrect="off"
              />
            </div>
            <span className="text-fg-faint mt-1 block text-xs">
              3-30 karakter; küçük harf, rakam, alt çizgi.
            </span>
          </label>

          <label className="block">
            <span className="text-fg-dim text-sm font-medium">Biyografi</span>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={500}
              rows={3}
              className={`${inputCls} resize-none`}
              placeholder="Kendinden kısaca bahset"
            />
          </label>

          <label className="block">
            <span className="text-fg-dim text-sm font-medium">Avatar bağlantısı (opsiyonel)</span>
            <input
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              maxLength={1000}
              inputMode="url"
              className={inputCls}
              placeholder="https://…"
            />
          </label>

          <label className="border-line bg-panel flex items-center justify-between rounded-xl border p-3">
            <span>
              <span className="text-fg block text-sm font-medium">Herkese açık profil</span>
              <span className="text-fg-faint block text-xs">
                Kapalıysa profilin ve ilanların keşfedilemez.
              </span>
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={isPublic}
              onClick={() => setIsPublic((v) => !v)}
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${isPublic ? 'bg-brand' : 'bg-panel-soft'}`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${isPublic ? 'left-0.5 translate-x-5' : 'left-0.5'}`}
              />
            </button>
          </label>

          {error && <p className="text-danger text-sm">{error}</p>}

          <button
            type="button"
            onClick={() => void save()}
            disabled={busy || loading}
            className="press bg-brand w-full rounded-lg py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </div>
      </div>

      <BottomNav />
    </main>
  );
}
