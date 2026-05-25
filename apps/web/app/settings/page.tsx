'use client';

/**
 * Settings — AI kullanımı (platform-managed, key girişi yok) + hesap/güvenlik.
 * Manuel BYOK key girişi kaldırıldı; AI uygulama içinde platform havuzuyla sağlanır.
 */
import type { ReactElement } from 'react';
import { Navbar } from '../../components/Navbar';
import { AccountSecurity } from '../../components/auth/AccountSecurity';

export default function SettingsPage(): ReactElement {
  return (
    <main className="bg-paper text-ink min-h-screen">
      <Navbar />
      <div className="shell max-w-3xl py-8 md:py-10">
        <h1 className="text-navy mb-6 font-serif text-3xl">Ayarlar</h1>

        <div className="rounded-card border-hairline bg-paper-2 text-ink-2 mb-6 border p-4 text-sm">
          🚧 <strong>Beta sürümü.</strong> AI artık uygulama içinde sağlanıyor — API key girmenize
          gerek yok. Beta kullanıcılarına aylık ücretsiz kullanım kotası ve <em>Erken Destekçi</em>{' '}
          rozeti.
        </div>

        <section className="rounded-card-lg border-hairline bg-surface mb-4 border p-6">
          <h2 className="text-navy mb-2 font-serif text-xl">AI Kullanımı</h2>
          <p className="text-ink-3 text-sm">
            Pusula AI&apos;ı uygulama içinde sağlar; kendi sağlayıcı anahtarınızı girmenize gerek
            yok. Skor açıklamaları, pazarlık önerileri ve sohbet platform havuzundan çalışır.
          </p>
          <p className="text-ink-3 mt-2 text-sm">
            Beta&apos;da aylık <strong>ücretsiz kullanım kotası</strong> tanımlıdır. Kota göstergesi
            ve plan yükseltme yakında bu sayfada.
          </p>
          <p className="text-muted mt-3 text-xs">
            İleri kullanıcılar için kendi sağlayıcı anahtarıyla kotasız kullanım
            (&quot;Gelişmiş&quot;) ilerleyen sürümde eklenecek.
          </p>
        </section>

        <AccountSecurity />
      </div>
    </main>
  );
}
