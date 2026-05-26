export default function Landing() {
  return (
    <main className="min-h-screen">
      {/* Navbar */}
      <nav className="border-b border-slate-200 bg-white/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-950 rounded-lg flex items-center justify-center">
              <span className="text-white font-serif text-lg">K</span>
            </div>
            <span className="font-serif text-2xl text-brand-950">Kavra</span>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <a href="#ozellikler" className="text-slate-600 hover:text-brand-950">
              Özellikler
            </a>
            <a href="#fiyat" className="text-slate-600 hover:text-brand-950">
              Fiyat
            </a>
            <a href="#indir" className="bg-brand-950 text-white px-4 py-2 rounded-lg font-semibold">
              İndir
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-24 text-center">
        <div className="inline-flex items-center gap-2 bg-accent-500/10 text-accent-700 px-3 py-1 rounded-full text-sm font-medium mb-6">
          <span>✨</span> 150 pedagojik teknik. Tek uygulama.
        </div>

        <h1 className="text-6xl md:text-7xl font-serif text-brand-950 leading-tight">
          Kavra.
          <br />
          <span className="text-accent-500">Her şeyi.</span>
        </h1>

        <p className="text-xl text-slate-600 mt-6 max-w-2xl mx-auto leading-relaxed">
          Kendi Groq anahtarınla sınırsız sohbet. PDF yükle, fotoğraf çek, konuşarak ders dinle. Her
          dilde. Tamamen senin kontrolünde.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-10">
          <a
            href="#indir"
            className="bg-brand-950 text-white px-8 py-4 rounded-xl font-semibold hover:bg-brand-800 transition"
          >
            Android'de İndir
          </a>
          <a
            href="#ozellikler"
            className="border border-slate-200 text-brand-950 px-8 py-4 rounded-xl font-semibold hover:bg-slate-50 transition"
          >
            Özellikleri Gör
          </a>
        </div>

        <div className="flex items-center justify-center gap-6 mt-8 text-sm text-slate-500">
          <span>🔒 Anahtarın sende</span>
          <span>🎙️ Sesli entegre</span>
          <span>📴 Offline çalışır</span>
        </div>
      </section>

      {/* Features */}
      <section id="ozellikler" className="bg-white border-y border-slate-100 py-24">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-4xl font-serif text-brand-950 text-center mb-4">
            Nasıl öğrendiğin kadar,
            <br />
            nasıl öğretildiğin de önemli.
          </h2>
          <p className="text-center text-slate-600 max-w-2xl mx-auto mb-16">
            Feynman, Zihin Sarayı, Sokratik yöntem — her teknik bir uzman tarafından seçilmiş, AI
            tarafından sana özel uygulanmış.
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            <Feature
              emoji="🧠"
              title="150 Teknik"
              desc="Hafızadan üstbilişe, odaklanmadan yaratıcılığa 7 ana modül + 10 AI kategorisi."
            />
            <Feature
              emoji="🎙️"
              title="Sesli Ders"
              desc="Konuşarak sor, AI'dan sesli cevap al. Whisper STT + 30+ dilde TTS."
            />
            <Feature
              emoji="📄"
              title="PDF + Fotoğraf"
              desc="Materyalini yükle, el yazısını tanısın, otomatik flashcard üretsin."
            />
            <Feature
              emoji="🎭"
              title="7 AI Kişilik"
              desc="Profesör, abla/abi, Sokratik, komedyen — ruh haline göre seç."
            />
            <Feature
              emoji="🔁"
              title="Aralıklı Tekrar"
              desc="SM-2 + Leitner. Unutma eğrine karşı tam zamanında tekrar."
            />
            <Feature
              emoji="🌍"
              title="Her Dil"
              desc="Arayüz Türkçe, içerik istediğin dilde. 16+ dil desteği."
            />
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="fiyat" className="py-24 max-w-6xl mx-auto px-6">
        <h2 className="text-4xl font-serif text-brand-950 text-center mb-4">
          Ücretsiz başla. İstersen Pro'ya geç.
        </h2>
        <p className="text-center text-slate-600 mb-16 max-w-2xl mx-auto">
          Groq anahtarın sende olduğu için LLM maliyeti bizde değil. Senden sadece ekstra özellikler
          için ücret alıyoruz.
        </p>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          <PriceCard
            name="Free"
            price="₺0"
            period="süresiz"
            cta="Hemen başla"
            features={[
              '150 tekniğin tümü',
              'Sınırsız metin chat (kendi Groq key)',
              'Cihaz TTS + Whisper STT',
              '5 PDF / ay',
              '2D kavram haritası',
              '3 AI kişilik',
            ]}
          />
          <PriceCard
            name="Pro"
            price="$4.99"
            period="/ay"
            highlight
            cta="Pro'ya geç"
            features={[
              '✨ Voice Cloning (kendi sesin)',
              '🎙️ High-quality TTS (tüm diller)',
              '🌌 3D kavram galaksi',
              '📚 Sınırsız PDF + otomatik flashcard',
              '🎭 7 AI kişilik + özel yaratma',
              '📊 PDF export + takvim sync',
            ]}
            extra="Yıllık $39 (%35 indirim) · Lifetime $99 (ilk 6 ay)"
          />
        </div>
      </section>

      {/* CTA */}
      <section id="indir" className="bg-brand-950 text-white py-24">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-serif mb-6">Bugün kavramaya başla.</h2>
          <p className="text-white/70 text-lg mb-10 max-w-xl mx-auto">
            Ücretsiz Android uygulamasını indir, Groq anahtarını ekle, istediğin dilde kavramaya
            başla.
          </p>
          <a
            href="#"
            className="inline-block bg-accent-500 text-white px-8 py-4 rounded-xl font-semibold hover:bg-accent-600 transition"
          >
            Google Play'den İndir
          </a>
          <p className="text-white/50 text-sm mt-4">
            iOS yakında · Web şu anda geliştirme aşamasında
          </p>
        </div>
      </section>

      <footer className="py-12 text-center text-sm text-slate-500 border-t border-slate-100">
        <p>© 2026 Kavra · Frankfurt, KVKK uyumlu</p>
        <div className="flex items-center justify-center gap-4 mt-2">
          <a href="/privacy" className="hover:text-brand-950">
            Gizlilik
          </a>
          <a href="/terms" className="hover:text-brand-950">
            Şartlar
          </a>
          <a href="/contact" className="hover:text-brand-950">
            İletişim
          </a>
        </div>
      </footer>
    </main>
  )
}

function Feature({ emoji, title, desc }: { emoji: string; title: string; desc: string }) {
  return (
    <div className="p-6 rounded-2xl border border-slate-100 bg-slate-50/50">
      <div className="text-3xl mb-3">{emoji}</div>
      <h3 className="font-semibold text-brand-950 text-lg mb-2">{title}</h3>
      <p className="text-slate-600 text-sm leading-relaxed">{desc}</p>
    </div>
  )
}

function PriceCard({
  name,
  price,
  period,
  features,
  cta,
  highlight,
  extra,
}: {
  name: string
  price: string
  period: string
  features: string[]
  cta: string
  highlight?: boolean
  extra?: string
}) {
  return (
    <div
      className={[
        'p-8 rounded-3xl border',
        highlight
          ? 'bg-brand-950 text-white border-brand-950 shadow-xl scale-[1.02]'
          : 'bg-white border-slate-200',
      ].join(' ')}
    >
      <div className="flex items-baseline gap-2">
        <h3 className={`text-2xl font-serif ${highlight ? 'text-white' : 'text-brand-950'}`}>
          {name}
        </h3>
        {highlight && (
          <span className="text-xs bg-accent-500 text-white px-2 py-0.5 rounded-full">Popüler</span>
        )}
      </div>
      <div className="mt-4 flex items-baseline gap-1">
        <span className={`text-5xl font-bold ${highlight ? 'text-white' : 'text-brand-950'}`}>
          {price}
        </span>
        <span className={highlight ? 'text-white/60' : 'text-slate-500'}>{period}</span>
      </div>
      <ul className={`mt-6 space-y-3 ${highlight ? 'text-white/90' : 'text-slate-700'}`}>
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <span className={highlight ? 'text-accent-300' : 'text-accent-500'}>✓</span>
            <span className="text-sm">{f}</span>
          </li>
        ))}
      </ul>
      {extra && (
        <p className={`text-xs mt-4 ${highlight ? 'text-white/60' : 'text-slate-500'}`}>{extra}</p>
      )}
      <button
        className={[
          'w-full mt-6 py-3 rounded-xl font-semibold transition',
          highlight
            ? 'bg-accent-500 text-white hover:bg-accent-600'
            : 'bg-brand-950 text-white hover:bg-brand-800',
        ].join(' ')}
      >
        {cta}
      </button>
    </div>
  )
}
