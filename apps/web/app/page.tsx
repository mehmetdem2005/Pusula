import Link from 'next/link';
import type { ReactElement } from 'react';

export default function LandingPage(): ReactElement {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0F1F4B] to-[#1a2d5e] text-white">
      <nav className="container mx-auto px-6 py-6 flex justify-between items-center">
        <div className="flex items-center gap-2 text-2xl font-bold">
          <span aria-hidden>🧭</span> Pusula
        </div>
        <div className="flex gap-4 items-center">
          <Link href="/auth/login" className="text-sm font-medium hover:text-[#D4A22E]">
            Giriş
          </Link>
          <Link
            href="/auth/signup"
            className="text-sm font-semibold bg-[#D4A22E] text-[#0F1F4B] px-5 py-2 rounded-full hover:bg-[#e6b840] transition"
          >
            Beta&apos;ya Katıl
          </Link>
        </div>
      </nav>

      <section className="container mx-auto px-6 py-20 text-center">
        <h1 className="text-6xl font-bold mb-4 leading-tight">
          Karar verirken <span className="text-[#D4A22E]">kaybolma.</span>
        </h1>
        <p className="text-2xl text-slate-200 max-w-3xl mx-auto mb-4 font-light">
          Türkiye&apos;nin emlak ve oto ilanları için <strong>AI destekli</strong> kelepir analiz aracı.
        </p>
        <p className="text-lg text-slate-300 max-w-2xl mx-auto mb-12">
          Tarayıcı eklentisi ile gezdiğin ilan sayfalarını Pusula otomatik analiz eder; mahalle,
          kalite, konum ve risk parametreleriyle birlikte hesaplayıp <strong>objektif bir kelepir
          skoru</strong> verir. AI asistanı parametreleri açıklar, pazarlık ipucu sunar, pazarlama
          metni üretir.
        </p>
        <div className="flex gap-4 justify-center mb-8">
          <Link
            href="/auth/signup"
            className="bg-[#D4A22E] text-[#0F1F4B] px-8 py-4 rounded-full font-bold text-lg hover:bg-[#e6b840] transition"
          >
            Ücretsiz Başla
          </Link>
          <Link
            href="#nasil-calisir"
            className="border border-white/30 px-8 py-4 rounded-full font-semibold text-lg hover:bg-white/10 transition"
          >
            Nasıl Çalışır?
          </Link>
        </div>
        <p className="text-sm text-slate-400">
          Kredi kartı gerekmez · Beta kullanıcılarına %50 yıllık indirim
        </p>
      </section>

      <section id="nasil-calisir" className="container mx-auto px-6 py-16 grid md:grid-cols-3 gap-8">
        {[
          { t: '1. İlanı Aç', d: 'Tarayıcında bir ilan sayfasına girince Pusula otomatik tetiklenir.' },
          { t: '2. Skor & Bileşenler', d: 'Fiyat avantajı, kalite, konum, risk dört eksende 0–100 arası kelepir skoru.' },
          { t: '3. AI Asistan', d: 'Skoru açıklar, pazarlık ipucu verir, pazarlama metni üretir.' },
        ].map((c) => (
          <div key={c.t} className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur">
            <h3 className="text-xl font-bold mb-2 text-[#D4A22E]">{c.t}</h3>
            <p className="text-slate-200">{c.d}</p>
          </div>
        ))}
      </section>

      <footer className="container mx-auto px-6 py-12 text-center text-sm text-slate-400 border-t border-white/10 mt-12">
        © 2026 Pusula · <Link href="/legal/kvkk" className="hover:text-[#D4A22E]">KVKK</Link> ·{' '}
        <Link href="/legal/kullanim" className="hover:text-[#D4A22E]">Kullanım Şartları</Link>
      </footer>
    </main>
  );
}
