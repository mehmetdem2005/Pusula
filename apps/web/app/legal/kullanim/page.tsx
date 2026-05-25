import Link from 'next/link';
import type { ReactElement } from 'react';

export default function KullanimPage(): ReactElement {
  return (
    <main className="bg-night font-body text-fg min-h-[100dvh] px-6 py-12">
      <article className="prose prose-invert container mx-auto max-w-3xl">
        <div className="mb-6 text-sm">
          <Link href="/" className="text-brand no-underline">
            ← Anasayfa
          </Link>
        </div>
        <h1>Kullanım Şartları</h1>
        <p className="text-fg-faint text-sm">Son güncelleme: 25 Mayıs 2026 — Beta sürümü</p>

        <h2>1. Hizmet</h2>
        <p>
          Pusula, kullanıcıların kendi ev, arsa ve oto ilanlarını fotoğraf ve videoyla yükleyip
          paylaştığı; diğer kullanıcıların dikey kaydırmalı bir akışta keşfettiği sosyal bir ilan ve
          keşif platformudur. Pusula <strong>emlak ya da oto komisyonculuğu yapmaz</strong>; alım,
          satım, kiralama görüşmesi ve işlemi taraflar arasında, platform dışında gerçekleşir.
        </p>

        <h2>2. Kullanıcı İçeriği ve Sorumluluğu</h2>
        <ul>
          <li>
            Yüklediğin içeriğin (fotoğraf, video, açıklama) doğruluğundan ve paylaşma hakkına sahip
            olduğundan <strong>sen sorumlusun</strong>.
          </li>
          <li>
            Başkasına ait telifli görseller, üçüncü kişilerin yüzü/plakası gibi kişisel veriler veya
            yanıltıcı bilgi yükleme.
          </li>
          <li>
            AI ile üretilen sanal tur videoları <strong>&quot;temsilî&quot;</strong> olarak
            etiketlenir; gerçek mekânı birebir yansıtmayabilir.
          </li>
          <li>
            Skor ve AI yorumları <strong>yatırım veya hukuki tavsiye değildir.</strong>
          </li>
        </ul>

        <h2>3. İçerik Moderasyonu ve Kaldırma</h2>
        <p>
          Kurallara aykırı içeriği bildirebilirsin; ağır ihlallerde (yasa dışı içerik, kişisel veri
          ihlali) ilan otomatik olarak yayından kaldırılabilir. Telif/şikâyet bildirimleri için{' '}
          <a href="mailto:destek@pusula.tr">destek@pusula.tr</a>.
        </p>

        <h2>4. Beta Statüsü</h2>
        <p>
          Pusula şu an Beta&apos;dadır; özellikler ve AI davranışı değişebilir. Beta&apos;da adil
          kullanım kotaları uygulanır.
        </p>

        <h2>5. Fikri Mülkiyet</h2>
        <p>
          Pusula kodu ve markası Pusula&apos;ya aittir. Yüklediğin içerik sana aittir; yayımlayarak
          Pusula&apos;ya platformda gösterme lisansı verirsin.
        </p>

        <h2>6. Sorumluluğun Sınırlandırılması</h2>
        <p>
          Hizmet &quot;olduğu gibi&quot; sunulur. Pusula doğrudan/dolaylı, kâr kaybı dahil herhangi
          bir zarardan, yürürlükteki mevzuat çerçevesinde, sorumlu tutulamaz.
        </p>

        <h2>7. Hesap Sonlandırma</h2>
        <p>
          Kullanıcı dilediği zaman hesabını silebilir (Ayarlar &rarr; Hesabımı Sil veya{' '}
          <a href="mailto:destek@pusula.tr">destek@pusula.tr</a>); profil, ilanlar, medya ve sohbet
          geçmişi silinir.
        </p>

        <h2>8. İhtilaflar</h2>
        <p>Türkiye hukuku uygulanır. İstanbul mahkemeleri yetkilidir.</p>
      </article>
    </main>
  );
}
