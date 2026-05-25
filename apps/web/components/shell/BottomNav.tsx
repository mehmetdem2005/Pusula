'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactElement, ReactNode } from 'react';

interface Item {
  href: string;
  label: string;
  icon: ReactNode;
  center?: boolean;
}

const I = {
  home: <path d="M3 10.5 12 3l9 7.5M5 9.5V21h5v-6h4v6h5V9.5" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  spark: <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" />,
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
    </>
  ),
};

const ITEMS: Item[] = [
  { href: '/kesfet', label: 'Akış', icon: I.home },
  { href: '/dashboard', label: 'Keşfet', icon: I.search },
  { href: '/ilan/yeni', label: 'Paylaş', icon: I.plus, center: true },
  { href: '/asistan', label: 'Asistan', icon: I.spark },
  { href: '/profil', label: 'Profil', icon: I.user },
];

/** Reels rebuild — frosted-glass alt navigasyon (mobil-öncelikli). SVG ikonlar. */
export function BottomNav(): ReactElement {
  const pathname = usePathname();
  return (
    <nav
      className="glass border-line fixed inset-x-0 bottom-0 z-50 border-t"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Ana navigasyon"
    >
      <ul className="mx-auto flex max-w-lg items-center justify-around px-2 py-2">
        {ITEMS.map((it) => {
          const active = pathname === it.href || pathname.startsWith(`${it.href}/`);
          if (it.center) {
            return (
              <li key={it.href}>
                <Link
                  href={it.href}
                  aria-label={it.label}
                  className="press brand-glow bg-brand flex h-12 w-12 items-center justify-center rounded-2xl text-white"
                >
                  <svg
                    width="26"
                    height="26"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {it.icon}
                  </svg>
                </Link>
              </li>
            );
          }
          return (
            <li key={it.href}>
              <Link
                href={it.href}
                aria-current={active ? 'page' : undefined}
                className={`press flex min-w-[56px] flex-col items-center gap-1 py-1 text-[10px] font-medium ${
                  active ? 'text-fg' : 'text-fg-faint hover:text-fg-dim'
                }`}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {it.icon}
                </svg>
                {it.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
