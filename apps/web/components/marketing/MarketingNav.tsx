'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactElement } from 'react';

const LINKS = [
  { href: '#nasil', label: 'Nasıl çalışır' },
  { href: '#skor', label: 'Skor' },
  { href: '#fiyat', label: 'Fiyat' },
  { href: '#sss', label: 'SSS' },
];

/** Sade pazarlama navigasyonu — logo, birkaç bağlantı, giriş + CTA, mobil menü. */
export function MarketingNav(): ReactElement {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-colors ${
        scrolled
          ? 'border-hairline bg-[color-mix(in_srgb,var(--paper)_85%,transparent)] backdrop-blur-md'
          : 'border-transparent'
      }`}
    >
      <div className="shell flex h-[72px] items-center justify-between">
        <Link href="/" className="brand !text-[22px]">
          <span className="brand-mark" aria-hidden="true" />
          <span>Pusula</span>
        </Link>

        <nav className="hidden items-center gap-9 md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-ink-3 hover:text-navy text-sm font-medium transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/auth/login"
            className="text-ink-2 hover:text-navy hidden text-sm font-medium transition-colors sm:block"
          >
            Giriş
          </Link>
          <Link href="/auth/signup" className="btn btn-gold btn-sm">
            Beta’ya Katıl
          </Link>
          <button
            className="rounded-card-sm text-ink-2 flex h-9 w-9 items-center justify-center md:hidden"
            aria-label="Menüyü aç"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
            >
              {open ? (
                <path d="M5 5l10 10M15 5L5 15" />
              ) : (
                <>
                  <path d="M3 6h14" />
                  <path d="M3 10h14" />
                  <path d="M3 14h14" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <div className="border-hairline border-t bg-[color-mix(in_srgb,var(--paper)_95%,transparent)] backdrop-blur-md md:hidden">
          <nav className="shell flex flex-col gap-1 py-4">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-card-sm text-ink-2 hover:bg-paper-2 px-2 py-3 text-[15px] font-medium"
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/auth/login"
              onClick={() => setOpen(false)}
              className="rounded-card-sm text-ink-2 hover:bg-paper-2 px-2 py-3 text-[15px] font-medium"
            >
              Giriş
            </Link>
            <Link href="/auth/signup" onClick={() => setOpen(false)} className="btn btn-gold mt-2">
              Beta’ya Katıl
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
