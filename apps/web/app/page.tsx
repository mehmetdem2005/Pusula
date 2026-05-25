import Link from 'next/link';
import type { ReactElement } from 'react';

const STEPS: [string, string, string][] = [
  ['Paylaş', 'Evini, arabanı ya da arsanı fotoğraf ve videoyla saniyeler içinde yükle.', '01'],
  ['Keşfet', 'Dikey kaydırmalı akışta ilanları izle, beğen, kaydet — tıpkı Reels gibi.', '02'],
  ['Değerlendir', 'Kaydettiğin ilanları AI panelinde karşılaştır; en kelepiri bul.', '03'],
];

const FEATURES: [string, string][] = [
  [
    'Dikey video akışı',
    'Her ilan tam ekran; kaydırdıkça keşfet. Fotoğraf ya da video, fark etmez.',
  ],
  ['AI sanal tur', 'Odaları gezen kısa tur videoları — yapay zekâ ile, “temsilî” etiketiyle.'],
  ['Kaydet & AI analiz', 'İlanları listelere kaydet; asistan hepsini karşılaştırıp yorumlasın.'],
  ['Sesli & yazılı asistan', 'Konuşarak ya da yazarak sor; kayıtlı ilanlarını bilen bir danışman.'],
];

export default function LandingPage(): ReactElement {
  return (
    <div className="bg-night font-body text-fg min-h-[100dvh]">
      {/* Top bar */}
      <header className="glass border-line sticky top-0 z-30 border-b">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-3">
          <span className="font-display text-fg text-xl font-bold tracking-tight">Pusula</span>
          <div className="flex items-center gap-2">
            <Link
              href="/auth/login"
              className="press text-fg-dim hover:text-fg px-3 py-2 text-sm font-semibold"
            >
              Giriş
            </Link>
            <Link
              href="/auth/signup"
              className="press bg-brand rounded-full px-4 py-2 text-sm font-semibold text-white"
            >
              Katıl
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto grid w-full max-w-5xl items-center gap-12 px-5 py-16 md:grid-cols-2 md:py-24">
        <div>
          <span className="text-fg-faint text-xs font-semibold uppercase tracking-[0.18em]">
            Ev · Arsa · Oto
          </span>
          <h1 className="font-display text-fg mt-4 text-4xl font-extrabold leading-[1.05] md:text-5xl">
            Paylaş.
            <br />
            Kaydır.
            <br />
            <span className="text-brand">Keşfet.</span>
          </h1>
          <p className="text-fg-dim mt-5 max-w-md text-base leading-relaxed">
            Pusula, insanların kendi ev, araba ve arsa ilanlarını fotoğraf ve videoyla paylaştığı,
            herkesin dikey kaydırmalı akışta keşfettiği sosyal platform. Beğen, kaydet, AI ile
            değerlendir.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/kesfet"
              className="press brand-glow bg-brand rounded-full px-6 py-3 text-sm font-semibold text-white"
            >
              Akışı keşfet →
            </Link>
            <Link
              href="/auth/signup"
              className="press border-line text-fg rounded-full border px-6 py-3 text-sm font-semibold"
            >
              Ücretsiz katıl
            </Link>
          </div>
        </div>

        {/* Reel önizleme (dekoratif) */}
        <div className="mx-auto w-full max-w-[280px]">
          <div className="border-line bg-night-soft relative aspect-[9/16] overflow-hidden rounded-[2rem] border shadow-2xl">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_25%,#2a2342,#0b0b0f_70%)]" />
            <div className="absolute inset-0 grid place-items-center">
              <span className="grid h-16 w-16 place-items-center rounded-full bg-white/10 backdrop-blur">
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="text-white"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
            </div>
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4">
              <div className="flex items-center gap-2">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-white/20 text-[10px] text-white">
                  M
                </span>
                <span className="text-xs text-white/80">@mudanya_ev</span>
              </div>
              <div className="font-display mt-1 text-lg font-bold text-white">4.250.000 ₺</div>
              <div className="text-xs text-white/70">Bursa · Mudanya · denize bakan</div>
            </div>
            <div className="absolute bottom-24 right-3 flex flex-col items-center gap-4 text-white">
              <svg
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="text-like"
              >
                <path d="M12 20s-7-4.4-9.3-8.7C1.3 8.5 2.7 5.2 6 5.2c2 0 3.2 1.2 4 2.6.8-1.4 2-2.6 4-2.6 3.3 0 4.7 3.3 3.3 6.1C19 15.6 12 20 12 20Z" />
              </svg>
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 4h12v17l-6-4-6 4V4Z" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* Nasıl çalışır */}
      <section className="border-line border-t">
        <div className="mx-auto w-full max-w-5xl px-5 py-16 md:py-20">
          <h2 className="font-display text-fg text-2xl font-bold md:text-3xl">Üç adımda</h2>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {STEPS.map(([t, d, n]) => (
              <div key={n}>
                <div className="text-brand font-mono text-sm">{n}</div>
                <h3 className="font-display text-fg mt-2 text-xl font-bold">{t}</h3>
                <p className="text-fg-dim mt-2 text-sm leading-relaxed">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Özellikler */}
      <section className="border-line border-t">
        <div className="mx-auto w-full max-w-5xl px-5 py-16 md:py-20">
          <h2 className="font-display text-fg text-2xl font-bold md:text-3xl">Neler var?</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {FEATURES.map(([t, d]) => (
              <div key={t} className="border-line bg-panel rounded-2xl border p-6">
                <h3 className="font-display text-fg text-lg font-bold">{t}</h3>
                <p className="text-fg-dim mt-2 text-sm leading-relaxed">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Güven / yasal */}
      <section className="border-line border-t">
        <div className="mx-auto w-full max-w-3xl px-5 py-14 text-center">
          <p className="text-fg-dim text-sm leading-relaxed">
            Pusula bir <strong className="text-fg">ilan ve keşif platformudur</strong> — emlak ya da
            oto komisyonculuğu yapmaz. İletişim ve işlem taraflar arasında, platform dışında
            gerçekleşir.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto w-full max-w-5xl px-5 py-16 md:py-20">
        <div className="border-line bg-panel rounded-3xl border px-8 py-14 text-center">
          <h2 className="font-display text-fg mx-auto max-w-xl text-2xl font-bold md:text-3xl">
            İlk ilanı sen paylaş.
          </h2>
          <p className="text-fg-dim mx-auto mt-3 max-w-md text-sm">
            Birkaç fotoğraf, kısa bir video — ve akışta herkes keşfetsin.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link
              href="/auth/signup"
              className="press brand-glow bg-brand rounded-full px-6 py-3 text-sm font-semibold text-white"
            >
              Ücretsiz katıl
            </Link>
            <Link
              href="/kesfet"
              className="press border-line text-fg rounded-full border px-6 py-3 text-sm font-semibold"
            >
              Önce keşfet
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-line border-t">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-5 py-10 sm:flex-row sm:items-center sm:justify-between">
          <span className="font-display text-fg text-lg font-bold">Pusula</span>
          <nav className="text-fg-dim flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <Link href="/kesfet" className="hover:text-fg">
              Akış
            </Link>
            <Link href="/legal/kvkk" className="hover:text-fg">
              KVKK
            </Link>
            <Link href="/legal/kullanim" className="hover:text-fg">
              Kullanım
            </Link>
          </nav>
          <div className="text-fg-faint text-xs">© 2026 Pusula</div>
        </div>
      </footer>
    </div>
  );
}
