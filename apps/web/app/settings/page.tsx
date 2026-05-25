'use client';

/**
 * Settings — AI kullanımı (platform-managed, key girişi yok) + hesap/güvenlik.
 * Manuel BYOK key girişi kaldırıldı; AI uygulama içinde platform havuzuyla sağlanır.
 */
import Link from 'next/link';
import type { ReactElement } from 'react';
import { AccountSecurity } from '../../components/auth/AccountSecurity';
import { BottomNav } from '../../components/shell/BottomNav';

export default function SettingsPage(): ReactElement {
  return (
    <main className="bg-night font-body text-fg min-h-[100dvh]">
      <header className="glass border-line sticky top-0 z-30 flex items-center justify-between border-b px-2 py-2.5">
        <Link
          href="/profil"
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
        </Link>
        <span className="text-fg text-sm font-semibold">Ayarlar</span>
        <span className="h-9 w-9" />
      </header>

      <div className="mx-auto w-full max-w-2xl px-4 pb-28 pt-4">
        <div className="border-line bg-panel text-fg-dim mb-4 rounded-2xl border p-4 text-sm">
          🚧 <strong className="text-fg">Beta sürümü.</strong> AI uygulama içinde sağlanıyor — API
          key girmene gerek yok. Beta kullanıcılarına aylık ücretsiz kota ve <em>Erken Destekçi</em>{' '}
          rozeti.
        </div>

        <section className="border-line bg-panel mb-4 rounded-2xl border p-6">
          <h2 className="font-display text-fg mb-2 text-lg font-bold">AI Kullanımı</h2>
          <p className="text-fg-dim text-sm">
            Pusula AI&apos;ı uygulama içinde sağlar; kendi sağlayıcı anahtarını girmene gerek yok.
            Skor açıklamaları, pazarlık önerileri ve sohbet platform havuzundan çalışır.
          </p>
          <p className="text-fg-faint mt-3 text-xs">
            İleri kullanıcılar için kendi anahtarıyla kotasız kullanım ilerleyen sürümde eklenecek.
          </p>
        </section>

        <AccountSecurity />
      </div>

      <BottomNav />
    </main>
  );
}
