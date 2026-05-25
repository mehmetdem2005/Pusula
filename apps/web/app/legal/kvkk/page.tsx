import Link from 'next/link';
import type { ReactElement } from 'react';

export default function KvkkPage(): ReactElement {
  return (
    <main className="bg-night font-body text-fg min-h-[100dvh] px-6 py-12">
      <article className="prose prose-invert container mx-auto max-w-3xl">
        <div className="mb-6 text-sm">
          <Link href="/" className="text-brand no-underline">
            ← Anasayfa
          </Link>
        </div>
        <h1>KVKK Aydınlatma Metni</h1>
        <p className="text-fg-faint text-sm">Son güncelleme: 25 Mayıs 2026</p>

        <h2>1. Veri Sorumlusu</h2>
        <p>
          Pusula (&quot;Pusula&quot;, &quot;biz&quot;) 6698 sayılı KVKK kapsamında veri
          sorumlusudur.
        </p>

        <h2>2. İşlenen Kişisel Veriler</h2>
        <ul>
          <li>
            <strong>Kimlik &amp; iletişim:</strong> ad, e-posta, rol (alıcı / emlakçı / galerici)
          </li>
          <li>
            <strong>Profil verisi:</strong> kullanıcı adı (handle), avatar, biyografi
          </li>
          <li>
            <strong>İçerik verisi:</strong> yüklediğin ilan bilgileri, fotoğraf ve videolar (medya),
            AI sohbet geçmişi
          </li>
          <li>
            <strong>Etkileşim verisi:</strong> beğeni, kaydetme, izlenme/görüntülenme kayıtları
            (öneri akışı için)
          </li>
          <li>
            <strong>Teknik veri:</strong> IP, tarayıcı, çerez, log
          </li>
          <li>
            <strong>AI kullanımı:</strong> Analizler uygulama içinde platform AI altyapısıyla
            sağlanır; kullanıcı kendi API anahtarını girmez.
          </li>
        </ul>

        <h2>3. Amaç</h2>
        <p>
          Hizmet sunumu, hesap yönetimi, ürün geliştirme, hukuki yükümlülüklerin yerine getirilmesi.
        </p>

        <h2>4. Hukuki Sebep</h2>
        <p>Açık rıza (md. 5/1), sözleşmenin ifası (5/2-c), meşru menfaat (5/2-f).</p>

        <h2>5. Aktarım</h2>
        <p>
          Skorlama ve AI açıklamaları için ilan metni/verisi, analiz amacıyla{' '}
          <strong>Pusula sunucusu üzerinden</strong> AI sağlayıcılarına (Groq / Gemini / DeepSeek /
          Anthropic) platform anahtarlarıyla iletilir. Bu sağlayıcıların sunucuları yurt dışında
          bulunabilir; aktarım hizmetin ifası ve açık rızanıza dayanır ve yalnız analiz için gerekli
          içerikle sınırlıdır.
        </p>

        <h2>6. Haklarınız (md. 11)</h2>
        <p>
          Verilerinize erişme, düzeltme, silme, işlemeyi sınırlandırma, taşınabilirlik ve itiraz
          hakkınız var. Başvuru: <a href="mailto:kvkk@pusula.tr">kvkk@pusula.tr</a>.
        </p>

        <h2>7. Çerezler</h2>
        <p>
          Yalnız oturum çerezi (Supabase auth) ve analitik (PostHog, opt-out edilebilir) çerezleri
          kullanılır. Reklam çerezi yoktur.
        </p>

        <p className="text-fg-faint mt-8 text-xs">
          Bu metin bilgi amaçlıdır, hukuki tavsiye değildir. Bir hukukçunun gözden geçirmesi tavsiye
          edilir.
        </p>
      </article>
    </main>
  );
}
