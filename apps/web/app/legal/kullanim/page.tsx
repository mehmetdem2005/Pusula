import Link from 'next/link';
import type { ReactElement } from 'react';

export default function KullanimPage(): ReactElement {
  return (
    <main className="min-h-screen bg-white px-6 py-12">
      <article className="prose prose-slate container mx-auto max-w-3xl">
        <div className="mb-6 text-sm">
          <Link href="/" className="text-sky-600 underline">
            ← Anasayfa
          </Link>
        </div>
        <h1>Kullanım Şartları</h1>
        <p className="text-sm text-slate-500">Son güncelleme: 22 Mayıs 2026 — Beta sürümü</p>

        <h2>1. Hizmet</h2>
        <p>
          Pusula, kullanıcının kendi tarayıcı oturumunda ziyaret ettiği ilan sayfalarını ekran
          üzerinden okuyarak skor üreten bir analiz aracıdır. Otomatik scraping yapmaz; kullanıcının
          oturumlu görüntülediği veriyi yapılandırır.
        </p>

        <h2>2. Kullanıcı Sorumluluğu</h2>
        <ul>
          <li>İlan kaynaklarının kullanım şartlarına uymak kullanıcıya aittir.</li>
          <li>AI analizleri platform tarafından sağlanır; adil kullanım kotalarına tabidir.</li>
          <li>
            Skor ve AI yorumları <strong>yatırım veya hukuki tavsiye değildir.</strong>
          </li>
        </ul>

        <h2>3. Beta Statüsü</h2>
        <p>
          Pusula şu an Beta&apos;dadır; formül, ağırlıklar ve özellikler değişebilir. Skor versiyonu
          her sonuçta gösterilir (örn. <code>v0.1</code>).
        </p>

        <h2>4. Fikri Mülkiyet</h2>
        <p>
          Pusula kodu ve markası Pusula&apos;ya aittir. Kullanıcı tarafından üretilen pazarlama
          metni ve özetler kullanıcıya aittir.
        </p>

        <h2>5. Sorumluluğun Sınırlandırılması</h2>
        <p>
          Hizmet &quot;olduğu gibi&quot; sunulur. Pusula doğrudan/dolaylı, kâr kaybı dahil herhangi
          bir zarardan, yürürlükteki mevzuat çerçevesinde, sorumlu tutulamaz.
        </p>

        <h2>6. Hesap Sonlandırma</h2>
        <p>
          Kullanıcı dilediği zaman hesabını silebilir (Ayarlar &rarr; Hesabımı Sil veya{' '}
          <a href="mailto:destek@pusula.tr">destek@pusula.tr</a>); profil, ilanlar ve sohbet geçmişi
          silinir.
        </p>

        <h2>7. İhtilaflar</h2>
        <p>Türkiye hukuku uygulanır. İstanbul mahkemeleri yetkilidir.</p>
      </article>
    </main>
  );
}
