'use client';

import Link from 'next/link';
import { useState, type ReactElement } from 'react';

interface Tier {
  name: string;
  desc: string;
  priceAy: string;
  priceYil: string;
  per?: string;
  note: (bill: 'ay' | 'yil') => string;
  features: string[];
  cta: string;
  href: string;
  featured?: boolean;
}

const TIERS: Tier[] = [
  {
    name: 'Keşif',
    desc: 'İlk konut alıcıları, meraklılar.',
    priceAy: '0',
    priceYil: '0',
    note: () => 'Sonsuza dek ücretsiz',
    features: ['Tarayıcı eklentisi', 'Ayda 30 ilan analizi', '4 pilarlı kelepir skoru'],
    cta: 'Ücretsiz başla',
    href: '/auth/signup',
  },
  {
    name: 'Pusula',
    desc: 'Yatırımcılar, emlakçılar, galericiler.',
    priceAy: '289',
    priceYil: '145',
    per: '/ ay',
    note: (b) => (b === 'ay' ? 'Aylık ödeme · iptal istediğinde' : 'Yıllık ödendiğinde'),
    features: [
      'Sınırsız ilan analizi',
      '8 pilar tam skorlama',
      'AI sohbet + sesli mod',
      'Portföy karşılaştırma + uyarılar',
    ],
    cta: 'Beta’ya katıl',
    href: '/auth/signup',
    featured: true,
  },
  {
    name: 'Kurumsal',
    desc: 'Acente, broker ve müteahhit ekipleri.',
    priceAy: 'Özel',
    priceYil: 'Özel',
    note: () => '5+ koltuk · API · SLA',
    features: [
      'Çoklu kullanıcı & rol',
      'API + webhook',
      'Özel skor kalibrasyonu',
      'Dedike hesap yöneticisi',
    ],
    cta: 'Satış ile görüş',
    href: '#',
  },
];

/** Sade fiyatlandırma — aylık/yıllık geçişi. Stripe yok; planlar tanıtım amaçlı. */
export function PricingTiers(): ReactElement {
  const [bill, setBill] = useState<'ay' | 'yil'>('ay');

  return (
    <div>
      <div className="mb-12 flex justify-center">
        <div className="rounded-card-sm border-hairline bg-surface inline-flex border p-1 text-sm">
          {(['ay', 'yil'] as const).map((b) => (
            <button
              key={b}
              onClick={() => setBill(b)}
              className={`rounded-[6px] px-4 py-1.5 font-medium transition-colors ${
                bill === b ? 'bg-navy text-cream' : 'text-ink-3 hover:text-navy'
              }`}
            >
              {b === 'ay' ? 'Aylık' : 'Yıllık'}
              {b === 'yil' && <span className="text-gold-deep ml-1.5 text-xs">−%50</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {TIERS.map((t) => {
          const price = bill === 'ay' ? t.priceAy : t.priceYil;
          const isNum = /^\d+$/.test(price);
          return (
            <article
              key={t.name}
              className={`rounded-card-lg flex flex-col border p-8 ${
                t.featured ? 'border-navy bg-surface shadow-card' : 'border-hairline bg-surface'
              }`}
            >
              <h3 className="text-navy font-serif text-2xl">{t.name}</h3>
              <p className="text-muted mt-1 text-sm">{t.desc}</p>
              <div className="mt-6 flex items-baseline gap-1">
                {isNum && <span className="text-ink-3 text-xl">₺</span>}
                <span className="text-ink font-serif text-5xl">{price}</span>
                {t.per && isNum && <span className="text-muted text-sm">{t.per}</span>}
              </div>
              <p className="text-muted mt-1 text-xs">{t.note(bill)}</p>
              <ul className="text-ink-2 mt-6 flex-1 space-y-3 text-sm">
                {t.features.map((f) => (
                  <li key={f} className="flex gap-2.5">
                    <span className="text-gold-deep mt-0.5">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link href={t.href} className={`btn mt-8 ${t.featured ? 'btn-gold' : 'btn-ghost'}`}>
                {t.cta}
              </Link>
            </article>
          );
        })}
      </div>
    </div>
  );
}
