import Link from 'next/link';
import type { ReactElement } from 'react';

export default function KvkkPage(): ReactElement {
  return (
    <main className="min-h-screen bg-white px-6 py-12">
      <article className="prose prose-slate container mx-auto max-w-3xl">
        <div className="mb-6 text-sm">
          <Link href="/" className="text-sky-600 underline">
            ← Anasayfa
          </Link>
        </div>
        <h1>KVKK Aydınlatma Metni</h1>
        <p className="text-sm text-slate-500">Son güncelleme: 22 Mayıs 2026</p>

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
            <strong>İşlem verisi:</strong> Kaydedilen ilan URL&apos;leri, skor hesaplama kayıtları,
            AI sohbet geçmişi
          </li>
          <li>
            <strong>Teknik veri:</strong> IP, tarayıcı, çerez, log
          </li>
          <li>
            <strong>API anahtarları (BYOK):</strong> AES-GCM 256 ile <em>tarayıcınızda</em>{' '}
            şifrelenir; Pusula sunucularına şifresiz hâliyle ulaşmaz.
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
          Verileriniz kural olarak yurt içinde işlenir. AI sağlayıcılarına (Groq / Gemini / DeepSeek
          / Anthropic) <strong>sadece kendi API key&apos;inizle, kendi tarayıcınızdan</strong> sorgu
          gider; Pusula sunucusu bu aktarımda taraf değildir. Anthropic için CORS sebebiyle proxy
          modunda geçici aktarım söz konusu olabilir.
        </p>

        <h2>6. Haklarınız (md. 11)</h2>
        <p>
          Verilerinize erişme, düzeltme, silme, işlemeyi sınırlandırma, taşınabilirlik ve itiraz
          hakkınız var. Başvuru: <a href="mailto:kvkk@pusula.tr">kvkk@pusula.tr</a>.
        </p>

        <h2>7. Çerezler</h2>
        <p>
          Yalnız oturum (sb-access-token) ve analitik (PostHog opt-out edilebilir) çerezleri
          kullanılır. Reklam çerezi yoktur.
        </p>

        <p className="mt-8 text-xs text-slate-400">
          Bu metin bilgi amaçlıdır, hukuki tavsiye değildir. Bir hukukçunun gözden geçirmesi tavsiye
          edilir.
        </p>
      </article>
    </main>
  );
}
