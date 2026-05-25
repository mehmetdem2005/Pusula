import Link from 'next/link';
import type { ReactElement } from 'react';
import '../styles/components.css';
import '../styles/landing.css';
import '../styles/nav.css';
import { MarketingNav } from '../components/marketing/MarketingNav';
import { StatCounter } from '../components/marketing/StatCounter';
import { PricingTiers } from '../components/marketing/PricingTiers';

const SOURCES = [
  'sahibinden',
  'hepsiemlak',
  'emlakjet',
  'zingat',
  'arabam',
  'letgo',
  'TÜİK',
  'AFAD',
  'TCMB',
  'Tapu Kadastro',
];

const FAQ: { q: string; a: ReactElement; open?: boolean }[] = [
  {
    q: 'Skor nasıl hesaplanıyor?',
    open: true,
    a: (
      <>
        Sekiz pilar (Fiyat Avt., Kalite, Konum, Risk, Vision, NLP, Pazar Dinamiği, Finansal Model)
        her biri kendi ağırlığıyla ağırlıklı toplam alır. Pilarların alt-bileşenleri comparable
        kümesi, kamu verisi, görsel + metin analizinden gelir. Tüm formül açık kaynaklı dokümante
        edilmiştir.
      </>
    ),
  },
  {
    q: 'Hangi siteleri destekliyor?',
    a: (
      <>
        Beta’da sahibinden, hepsiemlak, emlakjet, zingat ve arabam destekleniyor. Talebe göre yeni
        kaynaklar eklenir.
      </>
    ),
  },
  {
    q: 'LLM skoru değiştirebilir mi?',
    a: (
      <>
        Hayır. LLM sayısal skora <strong>asla dokunmaz</strong> — sadece açıklama, pazarlık ipucu ve
        pazarlama metni üretir. Skor deterministik bir motorla hesaplanır.
      </>
    ),
  },
  {
    q: 'Veri gizliliği nasıl?',
    a: (
      <>
        Yalnızca açıkça analiz ettiğin ilanlar Pusula sunucusuna gönderilir. KVKK ve GDPR uyumlu;
        sohbet geçmişin hesabına özeldir.
      </>
    ),
  },
  {
    q: 'Arsa ve oto da destekliyor mu?',
    a: (
      <>
        Konut ana MVP’dir; arsa V0.2’de aktif, oto V2’de aktif olur. Multi-vertical scoring-core
        mimarisi her dikey için ayrı parametre seti tutar.
      </>
    ),
  },
  {
    q: 'Sesli mod nasıl çalışır?',
    a: (
      <>
        Mikrofona konuşursun, Groq Whisper saniyeler içinde yazıya çevirir; Pusula AI cevabı Gemini
        TTS ile sesli yanıtlar. Eller serbest, gerçek konuşma temposunda.
      </>
    ),
  },
];

export default function LandingPage(): ReactElement {
  return (
    <>
      <MarketingNav />

      {/* HERO */}
      <section className="lp-hero">
        <div className="shell lp-hero-inner">
          <div>
            <div className="lp-eyebrow-row">
              <span className="lp-pill">
                <span className="dot" /> Beta · Türkiye Geneli
              </span>
              <span className="eyebrow">
                <span className="line" /> Emlak &amp; Arsa &amp; Oto Zekâsı
              </span>
            </div>

            <h1>
              Karar verirken
              <br />
              <em>kaybolma.</em>
            </h1>

            <p className="lp-sub">
              Pusula, Türkiye’deki ilanları sekiz pilarda inceler;{' '}
              <strong>deterministik kelepir skoru</strong>, mahalle bağlamı, vision &amp; metin
              analizi ile size <strong>tek bir net rakam</strong> verir. AI asistanı her kararı
              gerekçesiyle açıklar.
            </p>

            <div className="lp-actions">
              <Link href="/dashboard" className="btn btn-gold btn-lg">
                Panele git <span className="arrow">→</span>
              </Link>
              <Link href="/dashboard" className="btn btn-ghost btn-lg">
                Örnek analizi gör
              </Link>
              <span className="micro">81 il · 973 ilçe · gerçek piyasa verisi</span>
            </div>

            <div className="lp-stats">
              <div className="lp-stat">
                <StatCounter count={3200000} suffix="+" />
                <span className="l">analiz edilen ilan</span>
              </div>
              <div className="lp-stat">
                <StatCounter count={8} />
                <span className="l">pilar · 80+ parametre</span>
              </div>
              <div className="lp-stat">
                <StatCounter count={4.2} decimals={1} prefix="±%" />
                <span className="l">hedonik fiyat sapması</span>
              </div>
            </div>
          </div>

          {/* Canlı analiz kartı */}
          <aside className="lp-feat-card">
            <span className="top-tag">Canlı Analiz</span>
            <div className="lp-fc-photo">
              <span className="ph-tag">Arsa · 1.842 m²</span>
              <span className="ph-coords">40.3725° N · 28.8851° E</span>
              <span className="ph-source">sahibinden</span>
            </div>
            <h3 className="lp-fc-title">Mudanya Bademli — denize bakan parsel</h3>
            <div className="lp-fc-loc">
              Bursa <span className="sep">·</span> Mudanya <span className="sep">·</span> İmar:
              konut · E:0,30
            </div>

            <div className="lp-fc-price-row">
              <div>
                <div className="lp-fc-price">4.250.000 ₺</div>
                <div className="lp-fc-price-sub">2.305 ₺ / m²</div>
              </div>
              <div className="lp-fc-piyasa">
                <span className="pct">−%28</span>
                <span className="lbl">piyasa altı</span>
              </div>
            </div>

            <div className="lp-fc-score">
              <div className="ring">
                <svg viewBox="0 0 100 100">
                  <circle className="tr" cx="50" cy="50" r="42" strokeWidth="6" />
                  <circle
                    className="pr"
                    cx="50"
                    cy="50"
                    r="42"
                    strokeWidth="6"
                    strokeDasharray="264"
                    strokeDashoffset="58"
                  />
                </svg>
                <div className="ring-num">
                  78<small>/100</small>
                </div>
              </div>
              <div className="pillars">
                <div className="p fiyat">
                  <span className="lbl">Fiyat Avt.</span>
                  <div className="bar">
                    <i style={{ width: '88%' }} />
                  </div>
                  <span className="val">88</span>
                </div>
                <div className="p konum">
                  <span className="lbl">Konum</span>
                  <div className="bar">
                    <i style={{ width: '74%' }} />
                  </div>
                  <span className="val">74</span>
                </div>
                <div className="p kalite">
                  <span className="lbl">Kalite</span>
                  <div className="bar">
                    <i style={{ width: '62%' }} />
                  </div>
                  <span className="val">62</span>
                </div>
                <div className="p risk">
                  <span className="lbl">Risk</span>
                  <div className="bar">
                    <i style={{ width: '46%' }} />
                  </div>
                  <span className="val">46</span>
                </div>
              </div>
            </div>

            <div className="lp-fc-foot">
              <span>
                <b>147</b> benzer ilan
              </span>
              <span>
                Güven · <b>YÜKSEK</b>
              </span>
              <Link
                href="/dashboard"
                style={{ color: 'var(--navy)', borderBottom: '1px solid var(--navy)' }}
              >
                Detay →
              </Link>
            </div>
          </aside>
        </div>
      </section>

      {/* VERİ KAYNAKLARI */}
      <section className="lp-sources marquee">
        <div className="shell lp-sources-inner">
          <span className="lp-sources-lbl">Veri kaynakları</span>
          <div className="lp-sources-list-wrap">
            <div className="lp-sources-track">
              {[...SOURCES, ...SOURCES].map((s, i) => (
                <span key={i}>
                  {s}
                  <span className="dot">·</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* NASIL ÇALIŞIR */}
      <section className="section" id="nasil">
        <div className="shell">
          <div className="section-head">
            <div className="lead">
              <span className="eyebrow">
                <span className="dot" /> Nasıl çalışır
              </span>
              <h2 className="h2">
                Üç katmanda, <em className="gold">açıklanabilir</em> zekâ.
              </h2>
            </div>
            <div className="meta">
              <p>
                Pusula deterministik bir çekirdek, ML zenginleştirme katmanı ve LLM sunum
                katmanından oluşur. <strong>LLM sayısal skora asla dokunmaz</strong> — sadece
                açıklar.
              </p>
              <a href="#skor" className="btn btn-link">
                Metodolojiyi oku →
              </a>
            </div>
          </div>

          <div className="lp-how-grid">
            <article className="lp-how">
              <div className="num">i.</div>
              <h3>İlanı yakala</h3>
              <p>
                Tarayıcı eklentisi sahibinden, hepsiemlak, emlakjet ve zingat sayfalarını arka
                planda yapılandırılmış veriye çevirir.
              </p>
              <div className="vis">
                <div className="l">
                  <b>parsel</b>
                  <span className="v">✓ tespit</span>
                </div>
                <div className="l">
                  <b>fotoğraflar</b>
                  <span className="v gold">12 görsel</span>
                </div>
                <div className="l">
                  <b>imar</b>
                  <span className="v">konut · E:0,30</span>
                </div>
                <div className="l">
                  <b>comparable</b>
                  <span className="v">147 ilan</span>
                </div>
              </div>
            </article>

            <article className="lp-how">
              <div className="num">ii.</div>
              <h3>Sekiz pilarda ölç</h3>
              <p>
                Fiyat avantajı, kalite, konum, risk, vision, NLP, pazar dinamiği ve finansal model —
                80+ parametreyi paralel hesaplar.
              </p>
              <div className="vis">
                <div className="l">
                  <b>fiyat avantajı (w:0.32)</b>
                  <span className="v">88</span>
                </div>
                <div className="l">
                  <b>kalite (w:0.16)</b>
                  <span className="v gold">62</span>
                </div>
                <div className="l">
                  <b>konum (w:0.14)</b>
                  <span className="v">74</span>
                </div>
                <div className="l">
                  <b>vision (w:0.08)</b>
                  <span className="v gold">66</span>
                </div>
              </div>
            </article>

            <article className="lp-how">
              <div className="num">iii.</div>
              <h3>AI ile karar al</h3>
              <p>
                Asistan skoru açıklar, pazarlık ipucu verir, gizli riskleri yüzeye çıkarır; eller
                serbestken sesle konuşur.
              </p>
              <div className="vis">
                <div className="l">
                  <b>açıklama</b>
                  <span className="v">3 paragraf</span>
                </div>
                <div className="l">
                  <b>pazarlık marjı</b>
                  <span className="v gold">~%6–9</span>
                </div>
                <div className="l">
                  <b>gizli risk</b>
                  <span className="v warn">2 uyarı</span>
                </div>
                <div className="l">
                  <b>karar</b>
                  <span className="v">Teklif ver</span>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* SKOR ANATOMİSİ */}
      <section className="section cream" id="skor">
        <div className="shell lp-pillars-grid">
          <div className="lp-pillar-card">
            <div className="lp-pc-top">
              <div className="meta">
                Bebek · 3+1 · 165 m² · 2018 yapı
                <br />
                <b>18.500.000 ₺</b> · 112.121 ₺/m²
              </div>
              <span className="band-w">Kaçırılmaz</span>
            </div>

            <div className="lp-pc-num">
              86<em>/100</em>
            </div>

            <div className="lp-pc-formula">
              Skor = 0.32·<b>FA</b> + 0.16·K + 0.14·L + 0.10·R + 0.08·V + 0.06·N + 0.08·PD + 0.06·F
            </div>

            <div className="lp-pc-pillars">
              {[
                ['Fiyat Avantajı', '0.32', 91],
                ['Kalite', '0.16', 82],
                ['Konum', '0.14', 94],
                ['Risk', '0.10', 68],
                ['Vision', '0.08', 77],
                ['NLP', '0.06', 71],
                ['Pazar Dinamiği', '0.08', 85],
                ['Finansal Model', '0.06', 79],
              ].map(([name, w, val]) => (
                <div key={name as string} className="lp-pc-p">
                  <div className="lp-pc-p-hd">
                    <span className="name">
                      {name} <span className="w">w {w}</span>
                    </span>
                    <span className="val">{val}</span>
                  </div>
                  <div className="lp-pc-p-bar">
                    <i style={{ width: `${val}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lp-pc-copy">
            <span className="eyebrow">
              <span className="dot" /> Skor anatomisi
            </span>
            <h3>
              Tek bir rakamın <em>arkasındaki</em> sekiz pilar.
            </h3>
            <p>
              Pusula skoru bir kara kutu değil.{' '}
              <strong>Her pilar kendi alt-bileşenlerine ayrılır</strong>, comparable kümeniz, görsel
              analiziniz ve metin sinyalleriniz hep izlenebilir. Yatırımcı profili seçtiğinizde
              ağırlıklar otomatik yeniden dağıtılır.
            </p>
            <p>
              Şu pilar <strong>%32 ağırlıkla en güçlü</strong>: fiyat avantajı. Mahalle medyanı vs.
              ilan m² fiyatı sigmoid eğrisi üzerinden normalize edilir.
            </p>

            <ol className="lp-pc-list">
              {[
                [
                  'i.',
                  'Fiyat Avantajı',
                  'Comparable median + hedonik regresyon · IQR outlier filtre',
                  '32%',
                ],
                [
                  'ii.',
                  'Kalite',
                  '13 alt-parametre: yaş, m², kat, ısıtma, otopark, asansör',
                  '16%',
                ],
                [
                  'iii.',
                  'Konum',
                  'Metro, okul, hastane, AVM, TÜİK gelir seviyesi, gentrifikasyon momentum',
                  '14%',
                ],
                ['iv.', 'Risk', 'AFAD PGA bandı, TBDY uyumu, fay mesafesi, tapu durumu', '10%'],
                [
                  'v.',
                  'Vision',
                  'Doğal ışık, manzara, gizli kusur tespiti, dekorasyon (Gemini Vision)',
                  '8%',
                ],
                [
                  'vi.',
                  'NLP',
                  'Yanıltıcı sözcük, kopyala-yapıştır, tonalite, gizli özellik çıkarımı',
                  '6%',
                ],
                [
                  'vii.',
                  'Pazar Dinamiği',
                  'DOM, indirim geçmişi, mahalle stok, sezonsallık, TCMB faiz',
                  '8%',
                ],
                [
                  'viii.',
                  'Finansal Model',
                  'Ekspertiz tahmini, kredi limiti, ROI, geri ödeme süresi',
                  '6%',
                ],
              ].map(([n, t, d, w]) => (
                <li key={t as string}>
                  <span className="n">{n}</span>
                  <span className="t">
                    {t}
                    <span>{d}</span>
                  </span>
                  <span className="w">{w}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* ÜRÜN ÖNİZLEME */}
      <section className="section" id="urun">
        <div className="shell">
          <div className="section-head">
            <div className="lead">
              <span className="eyebrow">
                <span className="dot" /> Ürün
              </span>
              <h2 className="h2">
                Portföyün, <em className="gold">tek tabloda.</em>
              </h2>
            </div>
            <div className="meta">
              <p>
                Eklentinin analiz ettiği her ilan panele düşer. Filtrele, sırala, karşılaştır.{' '}
                <strong>Gelişmiş sayfalama</strong> ile binlerce ilan tek akışta.
              </p>
              <Link href="/dashboard" className="btn btn-link">
                Panele git →
              </Link>
            </div>
          </div>

          <div className="lp-product-shell">
            <div className="lp-browser-bar">
              <div className="dots">
                <i />
                <i />
                <i />
              </div>
              <div className="url">
                <b>app.pusula.tr</b>/panel
              </div>
              <div className="sync">v2.4 · son senkron 2 dk önce</div>
            </div>

            <div className="lp-product-body" style={{ padding: 32, background: 'var(--paper)' }}>
              <div className="kpi-row" style={{ marginBottom: 24 }}>
                {[
                  ['Toplam Analiz', '1.284', '↗ +47 son 7g', ''],
                  ['Ortalama Skor', '62/100', '↗ +3 son 7g', ''],
                  ['Kaçırılmaz', '28', '↗ +6 son 7g', ''],
                  ['Pazarlık Potansiyel', '₺4.2M', '— sabit', 'flat'],
                ].map(([lbl, val, trend, flat]) => (
                  <div key={lbl} className="kpi">
                    <div className="k-lbl">{lbl}</div>
                    <div className="k-val">{val}</div>
                    <div className={`k-trend${flat ? 'flat' : ''}`}>{trend}</div>
                  </div>
                ))}
              </div>

              <div className="toolbar" style={{ marginBottom: 20 }}>
                <div className="tabs">
                  <button className="tab active">
                    Tümü <span className="count">1284</span>
                  </button>
                  <button className="tab">
                    Konut <span className="count">842</span>
                  </button>
                  <button className="tab">
                    Arsa <span className="count">316</span>
                  </button>
                  <button className="tab">
                    Oto <span className="count">126</span>
                  </button>
                </div>
                <div className="grow" />
                <span className="chip active">
                  Kelepir+ <span className="x">×</span>
                </span>
                <span className="chip active">
                  Marmara <span className="x">×</span>
                </span>
                <select className="select" style={{ width: 'auto' }} defaultValue="Skor (yüksek)">
                  <option>Skor (yüksek)</option>
                  <option>Yeni eklenen</option>
                  <option>Piyasa sapması</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                {[
                  {
                    t: 't1',
                    tag: 'Arsa',
                    band: 'kacirilmaz',
                    bandL: 'Kaçırılmaz',
                    score: 86,
                    title: 'Mudanya Bademli, denize bakan 1.842 m²',
                    loc: 'Bursa · Mudanya',
                    meta: [
                      ['1.842', ' m²'],
                      ['E:', '0.30'],
                      ['147', ' comp.'],
                    ],
                    price: '4,25 M ₺',
                    piyasa: '−%28',
                  },
                  {
                    t: 't2',
                    tag: 'Konut · 3+1',
                    band: 'kelepir',
                    bandL: 'Kelepir',
                    score: 79,
                    title: 'Bebek sahile 180m, 2018 yapı, çelik konstr.',
                    loc: 'İstanbul · Beşiktaş · Bebek',
                    meta: [
                      ['165', ' m²'],
                      ['2018', ''],
                      ['3+1', ''],
                    ],
                    price: '18,5 M ₺',
                    piyasa: '−%19',
                  },
                  {
                    t: 't3',
                    tag: 'Arsa · İmarlı',
                    band: 'iyi',
                    bandL: 'İyi Fiyat',
                    score: 68,
                    title: 'Çeşme Ildırı, taş ev yapılabilir 980 m²',
                    loc: 'İzmir · Çeşme · Ildırı',
                    meta: [
                      ['980', ' m²'],
                      ['E:', '0.20'],
                      ['34', ' comp.'],
                    ],
                    price: '6,80 M ₺',
                    piyasa: '−%11',
                  },
                ].map((c) => (
                  <article key={c.title} className="ilan">
                    <div className={`ilan-img ${c.t}`}>
                      <span className="ilan-tag">{c.tag}</span>
                      <div className={`ilan-score-pill ${c.band}`}>
                        <span className="n">{c.score}</span>
                        <span className="lbl">Skor</span>
                      </div>
                    </div>
                    <div className="ilan-body">
                      <span className={`band ${c.band}`} style={{ marginBottom: 10 }}>
                        {c.bandL}
                      </span>
                      <h4 className="ilan-title">{c.title}</h4>
                      <div className="ilan-loc">{c.loc}</div>
                      <div className="ilan-meta-row">
                        {c.meta.map(([a, b], i) => (
                          <span key={i}>
                            {(a ?? '').startsWith('E:') ? (
                              <>
                                E:<b>{b}</b>
                              </>
                            ) : (
                              <>
                                <b>{a}</b>
                                {b}
                              </>
                            )}
                          </span>
                        ))}
                      </div>
                      <div className="ilan-row">
                        <div className="ilan-price">{c.price}</div>
                        <div className="ilan-piyasa">
                          <b>{c.piyasa}</b>piyasa altı
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: 24,
                  paddingTop: 20,
                  borderTop: '1px solid var(--hairline)',
                }}
              >
                <div className="pager-info">
                  <b>1–3</b> arası gösteriliyor · toplam <b>1.284</b> ilan
                </div>
                <div className="row center gap-4">
                  <div className="pager-size">
                    <span>Sayfa başına</span>
                    <select className="select" defaultValue="24">
                      <option>24</option>
                      <option>48</option>
                      <option>96</option>
                    </select>
                  </div>
                  <div className="pager">
                    <button className="icon" disabled>
                      ←
                    </button>
                    <button className="active">1</button>
                    <button>2</button>
                    <button>3</button>
                    <button>4</button>
                    <span className="dots">…</span>
                    <button>54</button>
                    <button className="icon">→</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI ASİSTAN & SESLİ MOD */}
      <section className="section lp-ai" id="asistan">
        <div className="shell lp-ai-grid">
          <div className="lp-ai-copy">
            <span className="eyebrow">
              <span className="dot" /> AI Asistan + Sesli Mod
            </span>
            <h2 className="h2">
              Sayılarla <em>konuşan</em> bir danışman.
            </h2>
            <p>
              İki mod: <strong>yazılı sohbet</strong> ve <strong>tam ekran sesli mod</strong>.
              Direksiyonda mı, ekspertizde mi — eller serbestken sor; ilan bilgisi +124 comparable +
              skor metrikleri ile birlikte cevaplasın.
            </p>

            <div className="lp-ai-modes">
              <Link href="/dashboard" className="lp-ai-mode">
                <span className="ic">i</span> Chat modu
                <span className="arr">→</span>
              </Link>
              <Link href="/dashboard" className="lp-ai-mode">
                <span className="ic">●</span> Sesli mod
                <span className="arr">→</span>
              </Link>
            </div>

            <div className="lp-ai-feats">
              <div className="lp-ai-feat">
                <span className="ico">i.</span>
                <div>
                  <div className="t">Pazarlık koçu</div>
                  <div className="d">
                    Karşı tarafa ne söyleyeceğin ve hangi sayıyı vereceğin — hazır taktik.
                  </div>
                </div>
              </div>
              <div className="lp-ai-feat">
                <span className="ico">ii.</span>
                <div>
                  <div className="t">Portföy karşılaştırma</div>
                  <div className="d">
                    Tüm ilanlarını bir arada görür, en iyi/riskli olanı sıralar.
                  </div>
                </div>
              </div>
              <div className="lp-ai-feat">
                <span className="ico">iii.</span>
                <div>
                  <div className="t">Gizli risk tespiti</div>
                  <div className="d">
                    Vision + NLP’in yakaladığı sinyalleri doğal dilde aktarır.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="lp-orb-wrap">
            <div className="lp-orb" />
            <div className="lp-orb-cap" style={{ bottom: -8 }}>
              Sesli moda geç
            </div>
          </div>
        </div>
      </section>

      {/* FİYATLANDIRMA */}
      <section className="section" id="fiyat">
        <div className="shell">
          <div className="section-head">
            <div className="lead">
              <span className="eyebrow">
                <span className="dot" /> Fiyatlandırma
              </span>
              <h2 className="h2">
                Açık, dürüst, <em className="gold">aylık.</em>
              </h2>
            </div>
            <div className="meta">
              <p>
                Beta kullanıcıları için yıllık plan ilk yıl <strong>yarı fiyatına</strong>. Kredi
                kartı gerekmez; iptal etmek tek tık.
              </p>
            </div>
          </div>

          <PricingTiers />
        </div>
      </section>

      {/* SSS */}
      <section className="section cream" id="sss">
        <div className="shell">
          <div className="section-head">
            <div className="lead">
              <span className="eyebrow">
                <span className="dot" /> Sıkça sorulanlar
              </span>
              <h2 className="h2">
                Bilmek <em className="gold">istediklerin.</em>
              </h2>
            </div>
            <div className="meta">
              <p>
                Aradığını bulamadın mı?{' '}
                <a href="#" style={{ color: 'var(--navy)', borderBottom: '1px solid var(--navy)' }}>
                  destek@pusula.tr
                </a>
              </p>
            </div>
          </div>

          <div className="lp-faq-grid">
            {FAQ.map((f) => (
              <details key={f.q} className="lp-faq" open={f.open}>
                <summary>
                  {f.q} <span className="ic" />
                </summary>
                <div className="a">{f.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA BANT */}
      <section className="lp-cta">
        <div className="shell">
          <h2>
            Bir sonraki ilana <em>hazırlıklı</em> git.
          </h2>
          <div className="actions">
            <Link href="/dashboard" className="btn btn-gold btn-lg">
              Panele git <span className="arrow">→</span>
            </Link>
            <Link
              href="/dashboard"
              className="btn btn-ghost btn-lg"
              style={{ borderColor: 'rgba(241,233,210,.3)', color: 'var(--cream)' }}
            >
              Örnek analizi gör
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="foot">
        <div className="foot-grid">
          <div>
            <div className="foot-brand">
              <span className="brand-mark" style={{ background: 'var(--gold-deep)' }} />
              Pusula
            </div>
            <div className="foot-tag">Karar verirken kaybolma.</div>
            <div
              style={{
                fontSize: 11,
                letterSpacing: '0.08em',
                color: 'rgba(241,233,210,.45)',
                textTransform: 'uppercase',
              }}
            >
              İstanbul · Ankara · İzmir
            </div>
          </div>
          <div>
            <h4>Ürün</h4>
            <ul>
              <li>
                <Link href="/dashboard">Panel</Link>
              </li>
              <li>
                <Link href="/dashboard">İlan analizi</Link>
              </li>
              <li>
                <Link href="/dashboard">AI Asistan</Link>
              </li>
              <li>
                <Link href="/dashboard">Sesli mod</Link>
              </li>
              <li>
                <a href="#">Tarayıcı eklentisi</a>
              </li>
            </ul>
          </div>
          <div>
            <h4>Kaynaklar</h4>
            <ul>
              <li>
                <a href="#skor">Skor metodolojisi</a>
              </li>
              <li>
                <a href="#">Mahalle raporları</a>
              </li>
              <li>
                <a href="#">API dokümanı</a>
              </li>
              <li>
                <a href="#">Blog</a>
              </li>
              <li>
                <a href="#">Değişiklik notları</a>
              </li>
            </ul>
          </div>
          <div>
            <h4>Şirket</h4>
            <ul>
              <li>
                <a href="#">Hakkımızda</a>
              </li>
              <li>
                <a href="#">Basın</a>
              </li>
              <li>
                <a href="#">Kariyer</a>
              </li>
              <li>
                <a href="#">İletişim</a>
              </li>
            </ul>
          </div>
          <div>
            <h4>Hukuki</h4>
            <ul>
              <li>
                <Link href="/legal/kvkk">KVKK</Link>
              </li>
              <li>
                <Link href="/legal/kullanim">Kullanım Şartları</Link>
              </li>
              <li>
                <a href="#">Çerez Politikası</a>
              </li>
              <li>
                <a href="#">Güvenlik</a>
              </li>
            </ul>
          </div>
        </div>
        <div className="foot-bottom">
          <div>© 2026 Pusula Teknoloji A.Ş. — Tüm hakları saklıdır.</div>
          <div className="legal">
            <span>v2.4.0</span>
            <span>Türkiye’de tasarlandı</span>
          </div>
        </div>
      </footer>
    </>
  );
}
