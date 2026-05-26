export const metadata = {
  title: 'Kullanım Şartları — Kavra',
  description: 'Kavra kullanım şartları ve sözleşme.',
}

export default function TermsPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-12 prose prose-slate">
      <h1 className="font-serif text-4xl text-ink-900">Kullanım Şartları</h1>
      <p className="text-sm text-slate-500">Son güncelleme: 1 Mayıs 2026</p>

      <p>
        Kavra'yı kullanmaya başladığında bu şartları kabul etmiş sayılırsın. Kısa, sade ve avukatça
        olmayan bir Türkçe ile yazıldı.
      </p>

      <h2>Hesap & Erişim</h2>
      <ul>
        <li>13 yaşından büyük olmalısın.</li>
        <li>Verdiğin email gerçek ve sana ait olmalı.</li>
        <li>Hesabını başkasına devretme veya paylaşma.</li>
        <li>Şifreni güvenli tut. Hesabında olan herşeyden sen sorumlusun.</li>
      </ul>

      <h2>Pro Abonelik</h2>
      <ul>
        <li>
          <strong>iOS / Android:</strong> Abonelik App Store / Play Store üzerinden otomatik
          yenilenir. Yenilemenin durması için süresinin bitmesinden 24 saat önce iptal etmelisin.
        </li>
        <li>
          <strong>Web:</strong> Aylık veya yıllık abonelik Stripe üzerinden yönetilir.
        </li>
        <li>
          <strong>Lifetime:</strong> Tek seferlik ödemedir. İade yok ama ömür boyu Pro.
        </li>
        <li>
          Apple / Google ücret değişikliği yapma hakkını saklı tutar (özellikle KDV oranları).
          Önemli değişiklikleri sana önceden bildiririz.
        </li>
      </ul>

      <h2>İade Politikası</h2>
      <p>
        Aboneliğin iadesini App Store / Play Store üzerinden talep et. Web Stripe abonelikleri için
        7 gün içinde <a href="mailto:billing@kavra.app">billing@kavra.app</a>'a yaz. Lifetime
        ödemeler iade edilmez (ancak hesap silinirse abonelik aktif kalır — devredilemez).
      </p>

      <h2>Yasak Kullanımlar</h2>
      <p>Kavra'yı kullanırken yapamayacakların:</p>
      <ul>
        <li>İllegal içerik üretmek veya dağıtmak (terör, çocuk istismarı, dolandırıcılık)</li>
        <li>AI cevaplarını başkalarını yanıltmak için kullanmak (deepfake, sahte alıntı)</li>
        <li>Kavra altyapısına saldırmak (DDOS, jailbreak attempts, scraping)</li>
        <li>Telif haklı materyali izinsiz toplu yüklemek</li>
        <li>Diğer kullanıcılara taciz, nefret, tehdit içerikli mesaj göndermek</li>
        <li>Spam veya rahatsız edici otomatik istek</li>
      </ul>
      <p>
        Bu kuralları ihlal eden hesaplar uyarı olmadan kapatılabilir; lifetime ödemeler dahil iade
        yapılmaz.
      </p>

      <h2>Senin İçeriğin</h2>
      <p>
        Yüklediğin PDF, video, metin senin. Kavra'nın bunları sadece{' '}
        <strong>sana hizmet vermek için</strong>
        kullanma hakkı vardır (AI işlemek, çevirmek, özetlemek). Asla başka kullanıcılara
        göstermeyiz, eğitim verisi olarak kullanmayız, satmayız.
      </p>
      <p>Yüklediğin içeriklerin telif veya gizlilik haklarını ihlal etmediğinden sen sorumlusun.</p>

      <h2>AI Çıktılarının Garantisi</h2>
      <p>
        AI cevapları doğru olmayabilir. Sınava girerken, tıbbi karar verirken, hukuki belge yazarken
        Kavra'nın çıktısını <strong>tek başına referans alma</strong>. AI yardımcıdır, kanıt
        değildir.
      </p>

      <h2>Sorumluluk Sınırı</h2>
      <p>
        Kavra "olduğu gibi" sunulur. Herhangi bir kayıp (sınavı kaçırma, iş kaybı, zaman, hayal
        kırıklığı dahil) için Kavra'nın yıllık ödediğin abonelik tutarından fazla sorumluluğu
        yoktur.
      </p>

      <h2>Hizmet Değişikliği & Sonlandırma</h2>
      <ul>
        <li>Pro fiyatlarını ve özelliklerini değiştirebiliriz (önceden bildirim ile).</li>
        <li>Free özellikleri kısıtlayabiliriz.</li>
        <li>Kavra kapanırsa (umarız hiç) tüm verilerini indirmen için en az 90 gün veririz.</li>
      </ul>

      <h2>Yasal Uyuşmazlıklar</h2>
      <p>
        Bu sözleşme Türkiye Cumhuriyeti yasalarına tabidir. Uyuşmazlıklar İstanbul Anadolu
        Mahkemeleri'nde çözülür. AB kullanıcıları için GDPR + ilgili AB tüketici hakları geçerlidir.
      </p>

      <h2>İletişim</h2>
      <p>
        <a href="mailto:legal@kavra.app">legal@kavra.app</a> — sözleşme ve hukuki konular
        <br />
        <a href="mailto:support@kavra.app">support@kavra.app</a> — kullanım ile ilgili her şey
        <br />
        <a href="mailto:billing@kavra.app">billing@kavra.app</a> — ödeme & iade
      </p>
    </main>
  )
}
