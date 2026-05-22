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
    <main className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="container mx-auto max-w-3xl px-6 py-8">
        <h1 className="mb-2 text-2xl font-bold">Ayarlar</h1>

        <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm">
          🚧 <strong>Beta sürümü.</strong> AI artık uygulama içinde sağlanıyor — API key girmenize
          gerek yok. Beta kullanıcılarına aylık ücretsiz kullanım kotası ve <em>Erken Destekçi</em>{' '}
          rozeti.
        </div>

        <section className="mb-4 rounded-lg bg-white p-6">
          <h2 className="mb-2 text-lg font-semibold">AI Kullanımı</h2>
          <p className="text-sm text-slate-600">
            Pusula AI&apos;ı uygulama içinde sağlar; kendi sağlayıcı anahtarınızı girmenize gerek
            yok. Skor açıklamaları, pazarlık önerileri ve sohbet platform havuzundan çalışır.
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Beta&apos;da aylık <strong>ücretsiz kullanım kotası</strong> tanımlıdır. Kota göstergesi
            ve plan yükseltme yakında bu sayfada.
          </p>
          <p className="mt-3 text-xs text-slate-400">
            İleri kullanıcılar için kendi sağlayıcı anahtarıyla kotasız kullanım
            (&quot;Gelişmiş&quot;) ilerleyen sürümde eklenecek.
          </p>
        </section>

        <AccountSecurity />
      </div>
    </main>
  );
}
