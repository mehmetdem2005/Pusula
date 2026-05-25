'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactElement } from 'react';
import { getSupabaseBrowser } from '../lib/supabase';
import { useTheme } from './ThemeProvider';

interface NavItem {
  href: string;
  label: string;
}

const NAV: NavItem[] = [
  { href: '/kesfet', label: 'Keşfet' },
  { href: '/dashboard', label: 'İlanlar' },
  { href: '/asistan', label: 'Asistan' },
  { href: '/settings', label: 'Ayarlar' },
];

/**
 * Ortak üst menü — Dashboard ve Settings sayfalarında. Aktif rota highlight'lanır,
 * giriş yapan kullanıcı gösterilir, "Çıkış" gerçekten signOut() yapar. Tema anahtarı içerir.
 */
export function Navbar(): ReactElement {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();
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
    <header className="border-hairline sticky top-0 z-40 border-b bg-[color-mix(in_srgb,var(--paper)_85%,transparent)] backdrop-blur-md">
      <div className="shell flex h-[68px] items-center justify-between">
        <Link href="/dashboard" className="brand !text-xl">
          <span className="brand-mark" aria-hidden="true" />
          <span>Pusula</span>
        </Link>

        <nav className="flex items-center gap-1 text-sm">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-card-sm px-3 py-1.5 font-medium transition-colors ${
                  active ? 'bg-paper-2 text-navy' : 'text-ink-3 hover:text-navy'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                {item.label}
              </Link>
            );
          })}

          <Link href="/ilan/yeni" className="btn btn-gold btn-sm ml-1">
            + İlan Ekle
          </Link>

          <button
            type="button"
            onClick={toggle}
            aria-label={theme === 'dark' ? 'Aydınlık moda geç' : 'Karanlık moda geç'}
            className="text-ink-3 hover:bg-paper-2 hover:text-navy ml-1 flex h-8 w-8 items-center justify-center rounded-full transition-colors"
          >
            {theme === 'dark' ? '☀' : '☾'}
          </button>

          {email && (
            <span className="text-muted ml-1 hidden max-w-[160px] truncate text-xs sm:inline">
              {email}
            </span>
          )}
          <button
            type="button"
            onClick={() => void logout()}
            disabled={busy}
            className="border-hairline-strong text-ink-2 hover:border-navy hover:text-navy ml-1 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-60"
          >
            {busy ? 'Çıkılıyor…' : 'Çıkış'}
          </button>
        </nav>
      </div>
    </header>
  );
}
