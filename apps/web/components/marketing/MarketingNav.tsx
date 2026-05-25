'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';

/**
 * Pazarlama üst çubuğu + navigasyon — tasarımın topbar/nav/mega-menü/mobil drawer/komut
 * paleti (⌘K) davranışlarını (nav.js) React'a taşır. Stiller styles/nav.css + components.css.
 * Linkler gerçek route'lara eşlenir; henüz kurulmamış ekranlar (/asistan, /sesli) panele yönlenir.
 */

type MegaName = 'urun' | 'cozum' | 'kaynak';

interface MegaItem {
  ico: string;
  title: string;
  desc: string;
  href: string;
  tag?: { label: string; beta?: boolean };
}
interface MegaColumn {
  heading: string;
  items: MegaItem[];
}
interface MegaPromo {
  tag: string;
  title: ReactElement;
  desc: string;
  cta: string;
  href: string;
}
interface MegaPanel {
  cols: '2-promo' | '3';
  columns: MegaColumn[];
  promo?: MegaPromo;
  foot?: boolean;
}

const MEGA: Record<MegaName, MegaPanel> = {
  urun: {
    cols: '2-promo',
    foot: true,
    columns: [
      {
        heading: 'Ana ürünler',
        items: [
          {
            ico: 'P',
            title: 'Panel',
            desc: '1.284 ilanı tek tabloda izle. Filtre, sıralama, gelişmiş sayfalama.',
            href: '/dashboard',
          },
          {
            ico: 'İ',
            title: 'İlan Analizi',
            desc: '8 pilar · 80+ parametre · comparable kümesi · gizli risk tespiti.',
            href: '/dashboard',
          },
          {
            ico: 'A',
            title: 'AI Asistan',
            desc: 'Sayılarla konuşan danışman. Pazarlık koçu, gizli risk açıklayıcı.',
            href: '/dashboard',
            tag: { label: 'Pro' },
          },
          {
            ico: 'S',
            title: 'Sesli Mod',
            desc: 'Eller serbest. Direksiyonda, ekspertizde gerçek zamanlı sesli sohbet.',
            href: '/dashboard',
            tag: { label: 'Yeni' },
          },
        ],
      },
      {
        heading: 'Yardımcı araçlar',
        items: [
          {
            ico: 'E',
            title: 'Tarayıcı Eklentisi',
            desc: 'Chrome & Firefox · sahibinden, hepsiemlak ve emlakjet’te tek tık.',
            href: '#',
          },
          {
            ico: 'M',
            title: 'Mahalle Raporu',
            desc: '973 ilçenin gelir, gentrifikasyon, risk ve fiyat trend skoru.',
            href: '#',
          },
          {
            ico: 'P',
            title: 'Portföy & Uyarılar',
            desc: 'İzleme listeleri, fiyat düşüş uyarısı, ekip paylaşımı.',
            href: '#',
          },
          {
            ico: 'F',
            title: 'Finansal Modeller',
            desc: 'Kira getirisi, kredi simülasyonu, ROI ve nakit akış senaryoları.',
            href: '#',
          },
        ],
      },
    ],
    promo: {
      tag: 'Beta · Bu ay',
      title: (
        <>
          Sesli mod, <em>direksiyonda</em>.
        </>
      ),
      desc: 'Mikrofona konuş, Pusula 124 comparable ile birlikte saniyeler içinde sesli cevap versin.',
      cta: 'Demo’yu dene',
      href: '/dashboard',
    },
  },
  cozum: {
    cols: '3',
    columns: [
      {
        heading: 'Profil bazlı',
        items: [
          {
            ico: 'Y',
            title: 'Yatırımcı',
            desc: 'ROI & nakit akışı odaklı skor ağırlığı.',
            href: '#',
          },
          {
            ico: 'İ',
            title: 'İlk ev alıcısı',
            desc: 'Risk & kalite ağırlıklı, kredi simülasyonu.',
            href: '#',
          },
          {
            ico: 'T',
            title: 'Tatil & arsa avcısı',
            desc: 'İmar, manzara & bölge potansiyeli.',
            href: '#',
          },
        ],
      },
      {
        heading: 'Profesyonel',
        items: [
          {
            ico: 'E',
            title: 'Emlakçı & ofis',
            desc: 'Çok kullanıcılı portföy, müşteri eşleştirme.',
            href: '#',
          },
          {
            ico: 'G',
            title: 'Galerici & oto',
            desc: 'Multi-vertical: araç değerleme & karşılaştırma.',
            href: '#',
          },
          {
            ico: 'M',
            title: 'Müteahhit',
            desc: 'Arsa fizibilitesi, imar & çevre analizi.',
            href: '#',
          },
        ],
      },
      {
        heading: 'Kurumsal',
        items: [
          { ico: 'B', title: 'Banka & finans', desc: 'Teminat değerleme API’si.', href: '#' },
          {
            ico: 'P',
            title: 'Pazaryeri ortaklığı',
            desc: 'İlan kalite skoru, white-label widget.',
            href: '#',
          },
          {
            ico: 'K',
            title: 'Kamu & veri',
            desc: 'Bölgesel trend raporları, anonimleştirilmiş veri.',
            href: '#',
          },
        ],
      },
    ],
  },
  kaynak: {
    cols: '2-promo',
    columns: [
      {
        heading: 'Öğren',
        items: [
          {
            ico: '∑',
            title: 'Skor metodolojisi',
            desc: 'Sekiz piların matematiksel açıklaması. Açık kaynak.',
            href: '#',
          },
          {
            ico: 'B',
            title: 'Blog & analizler',
            desc: 'Piyasa analizleri, mahalle yazıları, vaka çalışmaları.',
            href: '#',
          },
          {
            ico: 'G',
            title: 'Glossary',
            desc: 'DOM, IQR, hedonik, comparable — terimlerin Türkçe sözlüğü.',
            href: '#',
          },
          {
            ico: 'V',
            title: 'Video kılavuzlar',
            desc: '2 dakikalık ürün turları ve eğitim videoları.',
            href: '#',
          },
        ],
      },
      {
        heading: 'Geliştirici',
        items: [
          {
            ico: '{ }',
            title: 'API dokümanı',
            desc: 'REST & webhook · 50 req/s · kotaları kurumsal.',
            href: '#',
            tag: { label: 'Beta', beta: true },
          },
          {
            ico: '⌘',
            title: 'Değişiklik notları',
            desc: 'v2.4: sesli mod GA · v2.3: arsa pilar seti.',
            href: '#',
          },
          {
            ico: 'S',
            title: 'Sistem durumu',
            desc: '7g uptime 99.97% · gerçek zamanlı izleme.',
            href: '#',
          },
          {
            ico: 'D',
            title: 'Destek & topluluk',
            desc: 'Discord, GitHub Discussions, e-posta & SLA.',
            href: '#',
          },
        ],
      },
    ],
    promo: {
      tag: 'Yeni · Bu hafta',
      title: (
        <>
          Marmara 2026 <em>fiyat raporu.</em>
        </>
      ),
      desc: '7 ilçe · 38 mahalle · 12 bin comparable. Bedava indir.',
      cta: 'PDF olarak indir',
      href: '#',
    },
  },
};

interface CmdkItem {
  ci: string;
  title: string;
  desc: string;
  keys: string[];
  href: string;
}
const CMDK_GROUPS: { heading: string; items: CmdkItem[] }[] = [
  {
    heading: 'Hızlı eylemler',
    items: [
      {
        ci: '+',
        title: 'Yeni ilan analiz et',
        desc: 'URL yapıştır, 12 saniyede sonuç.',
        keys: ['N'],
        href: '/dashboard',
      },
      {
        ci: 'P',
        title: 'Panele git',
        desc: 'Tüm analiz edilen ilanlar.',
        keys: ['G', 'P'],
        href: '/dashboard',
      },
      {
        ci: '●',
        title: 'Sesli moda geç',
        desc: 'Eller serbest, gerçek zamanlı sohbet.',
        keys: ['V'],
        href: '/dashboard',
      },
      {
        ci: 'i',
        title: 'AI Asistanı aç',
        desc: 'Pazarlık koçu & portföy karşılaştırma.',
        keys: ['A'],
        href: '/dashboard',
      },
    ],
  },
  {
    heading: 'Sayfalar',
    items: [
      { ci: '⌂', title: 'Anasayfa', desc: 'Pusula tanıtım sayfası', keys: ['/'], href: '/' },
      {
        ci: '₺',
        title: 'Fiyatlandırma',
        desc: 'Keşif · Pusula · Kurumsal',
        keys: [],
        href: '#fiyat',
      },
      {
        ci: '?',
        title: 'Sıkça sorulanlar',
        desc: 'Skor, gizlilik, kapsam',
        keys: [],
        href: '#sss',
      },
      {
        ci: '∴',
        title: 'Nasıl çalışır?',
        desc: 'Üç katmanda açıklanabilir zekâ',
        keys: [],
        href: '#nasil',
      },
    ],
  },
  {
    heading: 'Yardım',
    items: [
      {
        ci: '∑',
        title: 'Skor metodolojisi',
        desc: 'Sekiz pilar nasıl hesaplanır',
        keys: [],
        href: '#skor',
      },
      { ci: '@', title: 'Destekle iletişim', desc: 'destek@pusula.tr', keys: [], href: '#' },
    ],
  },
];

const DRAWER_ACC: {
  title: string;
  defaultOpen?: boolean;
  items: { di: string; label: string; dd?: string; href: string }[];
}[] = [
  {
    title: 'Ürün',
    defaultOpen: true,
    items: [
      { di: 'P', label: 'Panel', dd: '1.284', href: '/dashboard' },
      { di: 'İ', label: 'İlan Analizi', dd: '8 pilar', href: '/dashboard' },
      { di: 'A', label: 'AI Asistan', dd: 'Pro', href: '/dashboard' },
      { di: 'S', label: 'Sesli Mod', dd: 'Yeni', href: '/dashboard' },
      { di: 'E', label: 'Tarayıcı Eklentisi', dd: 'Beta', href: '#' },
    ],
  },
  {
    title: 'Çözümler',
    items: [
      { di: 'Y', label: 'Yatırımcı', href: '#' },
      { di: 'İ', label: 'İlk ev alıcısı', href: '#' },
      { di: 'E', label: 'Emlakçı & ofis', href: '#' },
      { di: 'G', label: 'Galerici & oto', href: '#' },
    ],
  },
  {
    title: 'Kaynaklar',
    items: [
      { di: '∑', label: 'Skor metodolojisi', href: '#skor' },
      { di: 'B', label: 'Blog & analizler', href: '#' },
      { di: 'A', label: 'API dokümanı', href: '#' },
      { di: 'S', label: 'Sistem durumu', href: '#' },
    ],
  },
];

export function MarketingNav(): ReactElement {
  const [scrolled, setScrolled] = useState(false);
  const [topbarClosed, setTopbarClosed] = useState(false);
  const [activeMega, setActiveMega] = useState<MegaName | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [cmdkOpen, setCmdkOpen] = useState(false);
  const [query, setQuery] = useState('');
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cmdkInputRef = useRef<HTMLInputElement>(null);

  // Topbar oturum-bazlı kapatma durumu.
  useEffect(() => {
    try {
      if (sessionStorage.getItem('pusula_topbar_dismissed') === '1') setTopbarClosed(true);
    } catch {
      /* yok say */
    }
  }, []);

  // Header scroll durumu.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // ⌘K / Ctrl+K + Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCmdkOpen((v) => !v);
      } else if (e.key === 'Escape') {
        setCmdkOpen(false);
        setDrawerOpen(false);
        setActiveMega(null);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Drawer/cmdk açıkken body scroll kilidi.
  useEffect(() => {
    const lock = drawerOpen || cmdkOpen;
    document.body.style.overflow = lock ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [drawerOpen, cmdkOpen]);

  useEffect(() => {
    if (cmdkOpen) {
      const t = setTimeout(() => cmdkInputRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
    setQuery('');
    return undefined;
  }, [cmdkOpen]);

  const openMega = useCallback((name: MegaName) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setActiveMega(name);
  }, []);
  const scheduleClose = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setActiveMega(null), 150);
  }, []);

  const dismissTopbar = () => {
    setTopbarClosed(true);
    try {
      sessionStorage.setItem('pusula_topbar_dismissed', '1');
    } catch {
      /* yok say */
    }
  };

  const q = query.toLowerCase().trim();
  const cmdkGroups = CMDK_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((it) => !q || `${it.title} ${it.desc}`.toLowerCase().includes(q)),
  })).filter((g) => g.items.length > 0);

  return (
    <>
      {!topbarClosed && (
        <div className="topbar" id="topbar">
          <div className="topbar-inner">
            <span className="topbar-tag">
              <span className="pulse" /> v2.4 Canlı
            </span>
            <span className="topbar-msg">
              Sesli mod artık <b>36 ilde aktif</b> · Yıllık Beta plan <b>%50 indirimle</b> Mayıs
              sonuna kadar.
            </span>
            <Link href="#fiyat" className="topbar-link">
              Beta’ya katıl <span className="arr">→</span>
            </Link>
            <button className="topbar-close" aria-label="Bildirimi kapat" onClick={dismissTopbar}>
              ×
            </button>
          </div>
        </div>
      )}

      <header className={`nav${scrolled ? 'is-scrolled' : ''}`}>
        <div className="shell nav-inner">
          <Link href="/" className="brand">
            <span className="brand-mark" aria-hidden="true" />
            <span>Pusula</span>
            <span className="brand-stat" aria-label="Sistem durumu">
              <span className="d" /> Canlı
            </span>
          </Link>

          <nav className="nav-links" role="navigation" aria-label="Ana menü">
            {(['urun', 'cozum', 'kaynak'] as MegaName[]).map((name) => (
              <a
                key={name}
                className={`nav-item${activeMega === name ? 'is-open' : ''}`}
                data-mega={name}
                tabIndex={0}
                onMouseEnter={() => openMega(name)}
                onMouseLeave={scheduleClose}
                onFocus={() => openMega(name)}
                onClick={(e) => {
                  e.preventDefault();
                  setActiveMega((cur) => (cur === name ? null : name));
                }}
              >
                {name === 'urun' ? 'Ürün' : name === 'cozum' ? 'Çözümler' : 'Kaynaklar'}{' '}
                <span className="chev">▾</span>
              </a>
            ))}
            <Link href="#fiyat" className="nav-item">
              Fiyatlandırma
            </Link>
            <a href="#" className="nav-item">
              Eklenti <span className="new">Yeni</span>
            </a>
          </nav>

          <div className="nav-cta">
            <button className="nav-cmd" aria-label="Komut paleti" onClick={() => setCmdkOpen(true)}>
              <span className="ico">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                >
                  <circle cx="6" cy="6" r="4.5" />
                  <path d="M9.5 9.5L12.5 12.5" />
                </svg>
              </span>
              <span className="lbl">İlan, mahalle veya komut ara</span>
              <kbd>⌘ K</kbd>
            </button>
            <span className="vrule" />
            <Link href="/auth/login" className="btn btn-ghost btn-sm">
              Giriş
            </Link>
            <Link href="/auth/signup" className="btn btn-gold btn-sm">
              Beta’ya Katıl <span className="arrow">→</span>
            </Link>
            <button
              className={`hamburger${drawerOpen ? 'is-open' : ''}`}
              aria-label="Menüyü aç"
              aria-controls="drawer"
              aria-expanded={drawerOpen}
              onClick={() => setDrawerOpen((v) => !v)}
            >
              <span />
              <span />
              <span />
            </button>
          </div>

          <div
            className="mega-host"
            onMouseEnter={() => closeTimer.current && clearTimeout(closeTimer.current)}
            onMouseLeave={scheduleClose}
          >
            {(Object.keys(MEGA) as MegaName[]).map((name) => {
              const panel = MEGA[name];
              return (
                <div
                  key={name}
                  className={`mega${activeMega === name ? 'is-open' : ''}`}
                  data-mega-panel={name}
                  data-cols={panel.cols}
                >
                  {panel.columns.map((col) => (
                    <div key={col.heading}>
                      <h5 className="mega-h">{col.heading}</h5>
                      <div className="mega-list">
                        {col.items.map((it) => (
                          <Link key={it.title} href={it.href} className="mega-item">
                            <span className="mi-ico">{it.ico}</span>
                            <span className="mi-t">
                              {it.title}
                              {it.tag && (
                                <span className={`tag${it.tag.beta ? 'beta' : ''}`}>
                                  {it.tag.label}
                                </span>
                              )}
                            </span>
                            <span className="mi-arr">→</span>
                            <span className="mi-d">{it.desc}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                  {panel.promo && (
                    <aside className="mega-promo">
                      <span className="pp-tag">{panel.promo.tag}</span>
                      <h4 className="pp-h">{panel.promo.title}</h4>
                      <p className="pp-d">{panel.promo.desc}</p>
                      <Link href={panel.promo.href} className="pp-cta">
                        {panel.promo.cta} <span className="arr">→</span>
                      </Link>
                    </aside>
                  )}
                  {panel.foot && (
                    <div className="mega-foot">
                      <div className="mf-meta">
                        <span className="it">
                          <span className="d" /> Tüm sistemler <b>çalışıyor</b>
                        </span>
                        <span className="it">
                          Son senkron <b>2 dk önce</b>
                        </span>
                        <span className="it">
                          Bugün <b>+1.847</b> analiz
                        </span>
                      </div>
                      <div className="mf-links">
                        <a href="#">Yenilikler →</a>
                        <a href="#">Yol haritası →</a>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </header>

      {/* Mobil drawer */}
      <div className={`drawer${drawerOpen ? 'is-open' : ''}`} id="drawer" aria-hidden={!drawerOpen}>
        <div className="drawer-bg" onClick={() => setDrawerOpen(false)} />
        <aside className="drawer-panel" role="dialog" aria-label="Menü">
          <header className="drawer-head">
            <Link href="/" className="brand" onClick={() => setDrawerOpen(false)}>
              <span className="brand-mark" aria-hidden="true" />
              <span>Pusula</span>
            </Link>
            <button
              className="drawer-close"
              aria-label="Menüyü kapat"
              onClick={() => setDrawerOpen(false)}
            >
              ✕
            </button>
          </header>
          <div className="drawer-body">
            {DRAWER_ACC.map((acc) => (
              <details key={acc.title} className="drawer-acc" open={acc.defaultOpen}>
                <summary>
                  {acc.title} <span className="chev">▾</span>
                </summary>
                <div className="drawer-acc-body">
                  {acc.items.map((it) => (
                    <Link
                      key={it.label}
                      href={it.href}
                      className="drawer-acc-item"
                      onClick={() => setDrawerOpen(false)}
                    >
                      <span className="di">{it.di}</span> {it.label}
                      {it.dd && <span className="dd">{it.dd}</span>}
                    </Link>
                  ))}
                </div>
              </details>
            ))}
            <Link href="#fiyat" className="drawer-link" onClick={() => setDrawerOpen(false)}>
              Fiyatlandırma <span className="arr">→</span>
            </Link>
            <a href="#" className="drawer-link" onClick={() => setDrawerOpen(false)}>
              İletişim <span className="arr">→</span>
            </a>
          </div>
          <footer className="drawer-foot">
            <Link href="/auth/login" className="btn btn-ghost" onClick={() => setDrawerOpen(false)}>
              Giriş yap
            </Link>
            <Link href="/auth/signup" className="btn btn-gold" onClick={() => setDrawerOpen(false)}>
              Beta’ya katıl <span className="arrow">→</span>
            </Link>
            <div className="legal">
              <span className="live">Tüm sistemler çalışıyor</span>
              <span>v2.4.0</span>
            </div>
          </footer>
        </aside>
      </div>

      {/* Komut paleti */}
      <div className={`cmdk${cmdkOpen ? 'is-open' : ''}`} id="cmdk" aria-hidden={!cmdkOpen}>
        <div className="cmdk-bg" onClick={() => setCmdkOpen(false)} />
        <div className="cmdk-panel" role="dialog" aria-label="Komut paleti">
          <div className="cmdk-search">
            <span className="ico">
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              >
                <circle cx="7" cy="7" r="5" />
                <path d="M11 11L14 14" />
              </svg>
            </span>
            <input
              ref={cmdkInputRef}
              type="text"
              placeholder="İlan, mahalle, sayfa veya komut ara…"
              autoComplete="off"
              spellCheck={false}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <kbd>esc</kbd>
          </div>
          <div className="cmdk-body">
            {cmdkGroups.map((g) => (
              <div key={g.heading} className="cmdk-group">
                <h6>{g.heading}</h6>
                {g.items.map((it) => (
                  <Link
                    key={it.title}
                    href={it.href}
                    className="cmdk-item"
                    onClick={() => setCmdkOpen(false)}
                  >
                    <span className="ci">{it.ci}</span>
                    <span className="ct">
                      <span className="t">{it.title}</span>
                      <span className="d">{it.desc}</span>
                    </span>
                    <span className="ck">
                      {it.keys.map((k, i) => (
                        <kbd key={i}>{k}</kbd>
                      ))}
                    </span>
                  </Link>
                ))}
              </div>
            ))}
            {cmdkGroups.length === 0 && (
              <div className="cmdk-group">
                <h6>Sonuç yok</h6>
              </div>
            )}
          </div>
          <div className="cmdk-foot">
            <span>Pusula komut paleti</span>
            <div className="keys">
              <span>
                <kbd>↑</kbd>
                <kbd>↓</kbd> gezin
              </span>
              <span>
                <kbd>⏎</kbd> seç
              </span>
              <span>
                <kbd>esc</kbd> kapat
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
