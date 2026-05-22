import Link from 'next/link';
import type { ReactElement } from 'react';

export default function LandingPage(): ReactElement {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0F1F4B] to-[#1a2d5e] text-white">
      <nav className="container mx-auto flex items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2 text-2xl font-bold">
          <span aria-hidden>🧭</span> Pusula
        </div>
        <div className="flex items-center gap-4">
          <Link href="/auth/login" className="text-sm font-medium hover:text-[#D4A22E]">
            Giriş
          </Link>
          <Link
            href="/auth/signup"
            className="rounded-full bg-[#D4A22E] px-5 py-2 text-sm font-semibold text-[#0F1F4B] transition hover:bg-[#e6b840]"
          >
            Beta&apos;ya Katıl
          </Link>
        </div>
      </nav>

      <section className="container mx-auto px-6 py-20 text-center">
        <h1 className="mb-4 text-6xl font-bold leading-tight">
          Karar verirken <span className="text-[#D4A22E]">kaybolma.</span>
        </h1>
        <p className="mx-auto mb-4 max-w-3xl text-2xl font-light text-slate-200">
          Türkiye&apos;nin emlak ve oto ilanları için <strong>AI destekli</strong> kelepir analiz
          aracı.
        </p>
        <p className="mx-auto mb-12 max-w-2xl text-lg text-slate-300">
          Tarayıcı eklentisi ile gezdiğin ilan sayfalarını Pusula otomatik analiz eder; mahalle,
          kalite, konum ve risk parametreleriyle birlikte hesaplayıp{' '}
          <strong>objektif bir kelepir skoru</strong> verir. AI asistanı parametreleri açıklar,
          pazarlık ipucu sunar, pazarlama metni üretir.
        </p>
        <div className="mb-8 flex justify-center gap-4">
          <Link
            href="/auth/signup"
            className="rounded-full bg-[#D4A22E] px-8 py-4 text-lg font-bold text-[#0F1F4B] transition hover:bg-[#e6b840]"
          >
            Ücretsiz Başla
          </Link>
          <Link
            href="#nasil-calisir"
            className="rounded-full border border-white/30 px-8 py-4 text-lg font-semibold transition hover:bg-white/10"
          >
            Nasıl Çalışır?
          </Link>
        </div>
        <p className="text-sm text-slate-400">
          Kredi kartı gerekmez · Beta kullanıcılarına %50 yıllık indirim
        </p>
      </section>

      <section
        id="nasil-calisir"
        className="container mx-auto grid gap-8 px-6 py-16 md:grid-cols-3"
      >
        {[
          {
            t: '1. İlanı Aç',
            d: 'Tarayıcında bir ilan sayfasına girince Pusula otomatik tetiklenir.',
          },
          {
            t: '2. Skor & Bileşenler',
            d: 'Fiyat avantajı, kalite, konum, risk dört eksende 0–100 arası kelepir skoru.',
          },
          { t: '3. AI Asistan', d: 'Skoru açıklar, pazarlık ipucu verir, pazarlama metni üretir.' },
        ].map((c) => (
          <div
            key={c.t}
            className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur"
          >
            <h3 className="mb-2 text-xl font-bold text-[#D4A22E]">{c.t}</h3>
            <p className="text-slate-200">{c.d}</p>
          </div>
        ))}
      </section>

      <footer className="container mx-auto mt-12 border-t border-white/10 px-6 py-12 text-center text-sm text-slate-400">
        © 2026 Pusula ·{' '}
        <Link href="/legal/kvkk" className="hover:text-[#D4A22E]">
          KVKK
        </Link>{' '}
        ·{' '}
        <Link href="/legal/kullanim" className="hover:text-[#D4A22E]">
          Kullanım Şartları
        </Link>
      </footer>
    </main>
  );
}
