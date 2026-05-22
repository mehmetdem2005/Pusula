'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactElement } from 'react';

interface NavItem {
  href: string;
  label: string;
}

const NAV: NavItem[] = [
  { href: '/dashboard', label: 'İlanlar' },
  { href: '/settings', label: 'Ayarlar' },
];

/**
 * Ortak üst menü — Dashboard ve Settings sayfalarında aynı tasarım.
 * Aktif rota highlight'lanır.
 */
export function Navbar(): ReactElement {
  const pathname = usePathname();

  return (
    <header className="bg-[#0F1F4B] text-white border-b border-white/10 sticky top-0 z-40">
      <div className="container mx-auto px-6 py-4 flex justify-between items-center">
        <Link href="/dashboard" className="flex flex-col leading-tight">
          <span className="text-xl font-bold flex items-center gap-2">🧭 Pusula</span>
          <span className="text-xs text-[#D4A22E]">Karar verirken kaybolma.</span>
        </Link>

        <nav className="flex gap-1 items-center text-sm">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  active
                    ? 'px-3 py-1.5 rounded-full bg-white/10 text-[#D4A22E] font-semibold'
                    : 'px-3 py-1.5 rounded-full hover:bg-white/5 hover:text-[#D4A22E] transition'
                }
                aria-current={active ? 'page' : undefined}
              >
                {item.label}
              </Link>
            );
          })}
          <Link
            href="/auth/login"
            className="ml-2 px-3 py-1.5 rounded-full border border-white/20 text-xs hover:bg-white/5"
          >
            Çıkış
          </Link>
        </nav>
      </div>
    </header>
  );
}
