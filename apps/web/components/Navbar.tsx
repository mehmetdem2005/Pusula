'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactElement } from 'react';
import { getSupabaseBrowser } from '../lib/supabase';

interface NavItem {
  href: string;
  label: string;
}

const NAV: NavItem[] = [
  { href: '/dashboard', label: 'İlanlar' },
  { href: '/settings', label: 'Ayarlar' },
];

/**
 * Ortak üst menü — Dashboard ve Settings sayfalarında. Aktif rota highlight'lanır,
 * giriş yapan kullanıcı gösterilir, "Çıkış" gerçekten signOut() yapar.
 */
export function Navbar(): ReactElement {
  const pathname = usePathname();
  const [email, setEmail] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getSupabaseBrowser()
      .auth.getUser()
      .then(({ data }) => setEmail(data.user?.email ?? null))
      .catch(() => setEmail(null));
  }, []);

  async function logout() {
    setBusy(true);
    await getSupabaseBrowser().auth.signOut();
    window.location.href = '/auth/login';
  }

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0F1F4B] text-white">
      <div className="container mx-auto flex items-center justify-between px-6 py-4">
        <Link href="/dashboard" className="flex flex-col leading-tight">
          <span className="flex items-center gap-2 text-xl font-bold">🧭 Pusula</span>
          <span className="text-xs text-[#D4A22E]">Karar verirken kaybolma.</span>
        </Link>

        <nav className="flex items-center gap-1 text-sm">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  active
                    ? 'rounded-full bg-white/10 px-3 py-1.5 font-semibold text-[#D4A22E]'
                    : 'rounded-full px-3 py-1.5 transition hover:bg-white/5 hover:text-[#D4A22E]'
                }
                aria-current={active ? 'page' : undefined}
              >
                {item.label}
              </Link>
            );
          })}
          {email && (
            <span className="ml-2 hidden max-w-[160px] truncate text-xs text-white/60 sm:inline">
              {email}
            </span>
          )}
          <button
            type="button"
            onClick={() => void logout()}
            disabled={busy}
            className="ml-2 rounded-full border border-white/20 px-3 py-1.5 text-xs hover:bg-white/5 disabled:opacity-60"
          >
            {busy ? 'Çıkılıyor...' : 'Çıkış'}
          </button>
        </nav>
      </div>
    </header>
  );
}
