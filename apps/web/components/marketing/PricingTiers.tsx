'use client';

import Link from 'next/link';
import { useState, type ReactElement } from 'react';

/** Fiyatlandırma — aylık/yıllık geçişi (tasarımdaki pricing-toggle). Stripe yok; planlar tanıtım amaçlı. */
export function PricingTiers(): ReactElement {
  const [bill, setBill] = useState<'ay' | 'yil'>('ay');

  return (
    <>
      <div className="lp-pricing-toggle" id="pricing-toggle">
        <button className={bill === 'ay' ? 'active' : ''} onClick={() => setBill('ay')}>
          Aylık
        </button>
        <button className={bill === 'yil' ? 'active' : ''} onClick={() => setBill('yil')}>
          Yıllık <span className="save">−%50 BETA</span>
        </button>
      </div>

      <div className="lp-tiers">
        <article className="lp-tier">
          <h3>Keşif</h3>
          <p className="t-desc">İlk konut alıcıları, meraklılar.</p>
          <div className="t-price">
            <span className="cur">₺</span>
            <span>0</span>
          </div>
          <div className="t-meta">Sonsuza dek ücretsiz</div>
          <ul>
            <li>
              <span className="ck">i.</span> Tarayıcı eklentisi
            </li>
            <li>
              <span className="ck">i.</span> Ayda 30 ilan analizi
            </li>
            <li>
              <span className="ck">i.</span> 4 pilarlı kelepir skoru
            </li>
            <li className="off">
              <span className="ck">i.</span> Vision + NLP pilarları
            </li>
            <li className="off">
              <span className="ck">i.</span> AI sohbet asistanı
            </li>
            <li className="off">
              <span className="ck">i.</span> Sesli mod
            </li>
            <li className="off">
              <span className="ck">i.</span> Portföy karşılaştırma
            </li>
          </ul>
          <Link href="/auth/signup" className="btn btn-ghost t-cta">
            Ücretsiz başla
          </Link>
        </article>

        <article className="lp-tier featured">
          <h3>Pusula</h3>
          <p className="t-desc">Yatırımcılar, emlakçılar, galericiler.</p>
          <div className="t-price">
            <span className="cur">₺</span>
            <span>{bill === 'ay' ? '289' : '145'}</span>
            <span className="per">/ ay</span>
          </div>
          <div className="t-meta">
            {bill === 'ay' ? 'Aylık ödeme · iptal istediğinde' : 'Yıllık ödendiğinde · normal ₺289'}
          </div>
          <ul>
            <li>
              <span className="ck">i.</span> Sınırsız ilan analizi
            </li>
            <li>
              <span className="ck">i.</span> 8 pilar tam skorlama
            </li>
            <li>
              <span className="ck">i.</span> AI sohbet + sesli mod
            </li>
            <li>
              <span className="ck">i.</span> Portföy karşılaştırma + uyarılar
            </li>
            <li>
              <span className="ck">i.</span> Pazarlık metni üretici
            </li>
            <li>
              <span className="ck">i.</span> Mahalle derin analiz raporu
            </li>
            <li>
              <span className="ck">i.</span> Excel / PDF dışa aktarım
            </li>
          </ul>
          <Link href="/auth/signup" className="btn btn-gold t-cta">
            Beta’ya katıl <span className="arrow">→</span>
          </Link>
        </article>

        <article className="lp-tier">
          <h3>Kurumsal</h3>
          <p className="t-desc">Acente, broker ve müteahhit ekipleri.</p>
          <div className="t-price">
            <span>Özel</span>
          </div>
          <div className="t-meta">5+ koltuk · API erişimi · SLA</div>
          <ul>
            <li>
              <span className="ck">i.</span> Pusula plan tüm özellikleri
            </li>
            <li>
              <span className="ck">i.</span> Çoklu kullanıcı & rol yönetimi
            </li>
            <li>
              <span className="ck">i.</span> API + webhook entegrasyonu
            </li>
            <li>
              <span className="ck">i.</span> Özel skor kalibrasyonu
            </li>
            <li>
              <span className="ck">i.</span> CRM & ERP entegrasyon
            </li>
            <li>
              <span className="ck">i.</span> Dedike hesap yöneticisi
            </li>
            <li>
              <span className="ck">i.</span> Onboarding eğitimi
            </li>
          </ul>
          <a href="#" className="btn btn-primary t-cta">
            Satış ile görüş <span className="arrow">→</span>
          </a>
        </article>
      </div>
    </>
  );
}
