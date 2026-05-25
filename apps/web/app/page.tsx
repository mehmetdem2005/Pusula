import Link from 'next/link';
import type { ReactElement } from 'react';
import '../styles/components.css';
import { MarketingNav } from '../components/marketing/MarketingNav';
import { StatCounter } from '../components/marketing/StatCounter';
import { PricingTiers } from '../components/marketing/PricingTiers';

const STEPS = [
  {
    n: '01',
    t: 'İlanı yakala',
    d: 'Tarayıcı eklentisi ilan sayfasını arka planda yapılandırılmış veriye çevirir.',
  },
  {
    n: '02',
    t: 'Sekiz pilarda ölç',
    d: 'Fiyat, kalite, konum, risk ve dört pilar daha — 80+ parametre paralel hesaplanır.',
  },
  {
    n: '03',
    t: 'AI ile karar al',
    d: 'Asistan skoru açıklar, pazarlık payını söyler, gizli riskleri yüzeye çıkarır.',
  },
];

const PILLARS: [string, string, number][] = [
  ['Fiyat Avantajı', '0.32', 91],
  ['Kalite', '0.16', 82],
  ['Konum', '0.14', 94],
  ['Risk', '0.10', 68],
  ['Vision', '0.08', 77],
  ['NLP', '0.06', 71],
  ['Pazar Dinamiği', '0.08', 85],
  ['Finansal Model', '0.06', 79],
];

const HERO_PILLARS: [string, number, string][] = [
  ['Fiyat Avt.', 88, 'var(--p-fiyat)'],
  ['Konum', 74, 'var(--p-konum)'],
  ['Kalite', 62, 'var(--p-kalite)'],
  ['Risk', 46, 'var(--p-risk)'],
];

const FAQ: { q: string; a: ReactElement }[] = [
  {
    q: 'Skor nasıl hesaplanıyor?',
    a: (
      <>
        Sekiz pilar her biri kendi ağırlığıyla ağırlıklı toplam alır; alt-bileşenler comparable
        kümesi, kamu verisi, görsel ve metin analizinden gelir.
      </>
    ),
  },
  {
    q: 'LLM skoru değiştirebilir mi?',
    a: (
      <>
        Hayır. LLM sayısal skora <strong>asla dokunmaz</strong> — yalnızca açıklar, pazarlık ipucu
        ve metin üretir. Skor deterministik bir motorla hesaplanır.
      </>
    ),
  },
  {
    q: 'Veri gizliliği nasıl?',
    a: (
      <>
        Yalnızca açıkça analiz ettiğin ilanlar işlenir. KVKK ve GDPR uyumlu; sohbet geçmişin
        hesabına özeldir.
      </>
    ),
  },
  {
    q: 'Sesli mod nasıl çalışır?',
    a: (
      <>
        Mikrofona konuşursun; yanıt cümle cümle, gerçek konuşma temposunda sesli gelir. Eller
        serbest.
      </>
    ),
  },
];

const RING_C = 264; // 2π·42
const heroScore = 78;

export default function LandingPage(): ReactElement {
  return (
    <div className="bg-paper text-ink min-h-screen">
      <MarketingNav />

      {/* HERO */}
      <section className="shell grid items-center gap-16 py-20 md:grid-cols-2 md:py-28">
        <div>
          <span className="eyebrow">
            <span className="dot" /> Emlak · Arsa · Oto zekâsı
          </span>
          <h1 className="h1 text-navy mt-5">
            Karar verirken
            <br />
            <em className="serif-it text-gold-deep">kaybolma.</em>
          </h1>
          <p className="text-ink-2 mt-6 max-w-md text-lg leading-relaxed">
            Pusula bir ilanı sekiz pilarda inceler ve sana <strong>tek bir net skor</strong> verir.
            AI asistanı her kararı gerekçesiyle açıklar.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/dashboard" className="btn btn-gold btn-lg">
              Panele git <span className="arrow">→</span>
            </Link>
            <Link href="/auth/signup" className="btn btn-ghost btn-lg">
              Ücretsiz başla
            </Link>
          </div>
          <div className="mt-12 flex gap-10">
            {[
              { v: <StatCounter count={3200000} suffix="+" />, l: 'analiz edilen ilan' },
              { v: <StatCounter count={8} />, l: 'pilar · 80+ parametre' },
              { v: <StatCounter count={4.2} decimals={1} prefix="±%" />, l: 'fiyat sapması' },
            ].map((s, i) => (
              <div key={i}>
                <div className="mono text-navy text-2xl font-medium">{s.v}</div>
                <div className="text-muted mt-1 text-xs">{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Canlı skor kartı */}
        <aside className="rounded-card-lg border-hairline bg-surface shadow-card border p-7">
          <div className="flex items-center justify-between">
            <span className="eyebrow">
              <span className="dot" /> Canlı analiz
            </span>
            <span className="band kelepir">Kelepir</span>
          </div>
          <h3 className="text-ink mt-4 font-serif text-2xl leading-tight">
            Mudanya Bademli — denize bakan parsel
          </h3>
          <div className="text-muted mt-1 text-sm">Bursa · Mudanya · İmar: konut · E:0,30</div>

          <div className="mt-6 flex items-end justify-between">
            <div>
              <div className="text-ink font-serif text-3xl">4.250.000 ₺</div>
              <div className="text-muted text-sm">2.305 ₺ / m²</div>
            </div>
            <div className="text-right">
              <div className="mono text-band-kelepir text-xl font-semibold">−%28</div>
              <div className="text-muted text-xs">piyasa altı</div>
            </div>
          </div>

          <div className="border-hairline mt-7 flex items-center gap-6 border-t pt-6">
            <div className="relative h-[120px] w-[120px] shrink-0">
              <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="var(--hairline)"
                  strokeWidth="6"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="var(--gold)"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={RING_C}
                  strokeDashoffset={RING_C * (1 - heroScore / 100)}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-navy font-serif text-3xl">
                  {heroScore}
                  <small className="text-muted text-sm">/100</small>
                </span>
              </div>
            </div>
            <div className="flex-1 space-y-2.5">
              {HERO_PILLARS.map(([label, val, color]) => (
                <div key={label} className="flex items-center gap-3 text-xs">
                  <span className="text-ink-3 w-16 shrink-0">{label}</span>
                  <span className="bg-hairline h-1.5 flex-1 overflow-hidden rounded-full">
                    <span
                      className="block h-full rounded-full"
                      style={{ width: `${val}%`, background: color }}
                    />
                  </span>
                  <span className="mono text-ink-2 w-5 text-right">{val}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="border-hairline text-muted mt-5 flex items-center justify-between border-t pt-4 text-xs">
            <span>
              <b className="text-ink-2">147</b> benzer ilan
            </span>
            <span>
              Güven · <b className="text-ink-2">YÜKSEK</b>
            </span>
            <Link href="/dashboard" className="text-navy hover:text-gold-deep font-medium">
              Detay →
            </Link>
          </div>
        </aside>
      </section>

      {/* NASIL ÇALIŞIR */}
      <section id="nasil" className="shell border-hairline border-t py-20 md:py-28">
        <div className="max-w-2xl">
          <span className="eyebrow">
            <span className="dot" /> Nasıl çalışır
          </span>
          <h2 className="h2 text-navy mt-4">
            Üç adımda, <em className="serif-it text-gold-deep">açıklanabilir</em> zekâ.
          </h2>
        </div>
        <div className="mt-14 grid gap-10 md:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n}>
              <div className="mono text-gold-deep text-sm">{s.n}</div>
              <h3 className="text-ink mt-3 font-serif text-2xl">{s.t}</h3>
              <p className="text-ink-3 mt-2 leading-relaxed">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SKOR ANATOMİSİ */}
      <section id="skor" className="border-hairline bg-paper-2 border-t py-20 md:py-28">
        <div className="shell grid items-center gap-14 md:grid-cols-2">
          <div className="rounded-card-lg border-hairline bg-surface shadow-card border p-8">
            <div className="flex items-start justify-between">
              <div className="text-muted text-sm">
                Bebek · 3+1 · 165 m² · 2018
                <br />
                <b className="text-ink-2">18.500.000 ₺</b> · 112.121 ₺/m²
              </div>
              <span className="band kacirilmaz">Kaçırılmaz</span>
            </div>
            <div className="text-navy mt-4 font-serif text-6xl">
              86<em className="serif-it text-muted text-2xl">/100</em>
            </div>
            <div className="mt-5 space-y-3">
              {PILLARS.map(([name, w, val]) => (
                <div key={name}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="text-ink-2">
                      {name} <span className="mono text-muted text-xs">w {w}</span>
                    </span>
                    <span className="mono text-ink">{val}</span>
                  </div>
                  <span className="bg-hairline mt-1 block h-1.5 overflow-hidden rounded-full">
                    <span
                      className="bg-navy block h-full rounded-full"
                      style={{ width: `${val}%` }}
                    />
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <span className="eyebrow">
              <span className="dot" /> Skor anatomisi
            </span>
            <h2 className="h2 text-navy mt-4">
              Tek rakamın <em className="serif-it text-gold-deep">arkasındaki</em> sekiz pilar.
            </h2>
            <p className="text-ink-2 mt-6 max-w-md leading-relaxed">
              Pusula skoru bir kara kutu değil. Her pilar kendi alt-bileşenlerine ayrılır;
              comparable kümen, görsel ve metin sinyallerin hep izlenebilir.
            </p>
            <p className="text-ink-3 mt-4 max-w-md leading-relaxed">
              En güçlü pilar <strong className="text-ink-2">%32 ağırlıkla fiyat avantajı</strong>:
              mahalle medyanı ile ilan m² fiyatı sigmoid eğrisinde normalize edilir.
            </p>
          </div>
        </div>
      </section>

      {/* FİYAT */}
      <section id="fiyat" className="shell border-hairline border-t py-20 md:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <span className="eyebrow justify-center">
            <span className="dot" /> Fiyatlandırma
          </span>
          <h2 className="h2 text-navy mt-4">
            Açık ve <em className="serif-it text-gold-deep">dürüst.</em>
          </h2>
          <p className="text-ink-3 mt-4">Kredi kartı gerekmez; iptal tek tık.</p>
        </div>
        <div className="mt-14">
          <PricingTiers />
        </div>
      </section>

      {/* SSS */}
      <section id="sss" className="border-hairline bg-paper-2 border-t py-20 md:py-28">
        <div className="shell mx-auto max-w-3xl">
          <div className="text-center">
            <span className="eyebrow justify-center">
              <span className="dot" /> Sıkça sorulanlar
            </span>
            <h2 className="h2 text-navy mt-4">
              Bilmek <em className="serif-it text-gold-deep">istediklerin.</em>
            </h2>
          </div>
          <div className="divide-hairline border-hairline mt-12 divide-y border-y">
            {FAQ.map((f) => (
              <details key={f.q} className="group py-5">
                <summary className="text-ink flex cursor-pointer list-none items-center justify-between gap-4 font-serif text-xl [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span className="text-muted transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="text-ink-3 mt-3 max-w-2xl leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="shell py-20 md:py-28">
        <div className="rounded-card-xl bg-navy text-cream px-8 py-16 text-center md:py-20">
          <h2 className="h2 text-cream mx-auto max-w-xl">
            Bir sonraki ilana <em className="serif-it text-gold-hi">hazırlıklı</em> git.
          </h2>
          <div className="mt-8 flex justify-center gap-3">
            <Link href="/dashboard" className="btn btn-gold btn-lg">
              Panele git <span className="arrow">→</span>
            </Link>
            <Link
              href="/auth/signup"
              className="btn btn-lg text-cream border border-[rgba(241,233,210,.3)] hover:bg-[rgba(241,233,210,.1)]"
            >
              Ücretsiz başla
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-hairline border-t">
        <div className="shell flex flex-col gap-6 py-10 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="brand !text-xl">
            <span className="brand-mark" aria-hidden="true" />
            <span>Pusula</span>
          </Link>
          <nav className="text-ink-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <Link href="/dashboard" className="hover:text-navy">
              Panel
            </Link>
            <a href="#skor" className="hover:text-navy">
              Skor
            </a>
            <a href="#fiyat" className="hover:text-navy">
              Fiyat
            </a>
            <Link href="/legal/kvkk" className="hover:text-navy">
              KVKK
            </Link>
            <Link href="/legal/kullanim" className="hover:text-navy">
              Kullanım
            </Link>
          </nav>
          <div className="text-muted text-xs">© 2026 Pusula</div>
        </div>
      </footer>
    </div>
  );
}
