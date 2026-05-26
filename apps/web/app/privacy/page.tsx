export const metadata = {
  title: 'Gizlilik Politikası — Kavra',
  description: 'Kavra gizlilik politikası ve veri işleme açıklamaları.',
}

export default function PrivacyPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-12 prose prose-slate">
      <h1 className="font-serif text-4xl text-ink-900">Gizlilik Politikası</h1>
      <p className="text-sm text-slate-500">Son güncelleme: 1 Mayıs 2026</p>

      <p>
        Kavra ("biz", "uygulama") senin verilerinin <strong>senin olduğunu</strong> savunur. Bu
        metin kısa ve sade — nasıl çalıştığımızı anlamayasın diye değil, anlayabilesin diye yazıldı.
      </p>

      <h2>Topladığımız veriler</h2>

      <h3>Hesap bilgileri</h3>
      <ul>
        <li>Email adresi (giriş için)</li>
        <li>Ad soyad (opsiyonel, "Profil" ekranından düzenlenir)</li>
        <li>Telefon numarası (opsiyonel, OTP ile giriş için)</li>
      </ul>

      <h3>Kullanıcı içeriği</h3>
      <ul>
        <li>Yüklediğin dosyalar (PDF, ses, EPUB)</li>
        <li>Yapıştırdığın URL'ler ve metinler</li>
        <li>YouTube videoları</li>
        <li>AI ile yaptığın sohbetler</li>
        <li>AI'ın senin için ürettiği içerikler (özet, flashcard, podcast)</li>
        <li>Kelime listesi, çalışma istatistikleri</li>
      </ul>

      <h3>Cihaz & teknik bilgiler</h3>
      <ul>
        <li>Cihaz tipi (iPhone 15, Pixel 8 vb.) ve OS sürümü</li>
        <li>App sürümü</li>
        <li>Push notification token (sen izin verirsen)</li>
        <li>Anonim hata raporları (Sentry)</li>
      </ul>

      <h2>Toplamadığımız veriler</h2>
      <ul>
        <li>❌ Konum bilgisi</li>
        <li>❌ Kişiler / rehber</li>
        <li>❌ Web tarama geçmişi</li>
        <li>❌ Reklam ID'si</li>
        <li>❌ Üçüncü taraf cookie</li>
        <li>❌ Cross-app takip</li>
      </ul>

      <h2>Verilerinle ne yaparız</h2>
      <p>
        Verilerin <strong>sadece sana hizmet vermek için</strong> kullanılır. Spesifik olarak:
      </p>
      <ul>
        <li>
          <strong>AI işlemcileri</strong>: Soruların ve içeriklerin OpenAI, Anthropic, Google
          Gemini, Groq, ElevenLabs gibi AI servislerine gönderilir. Bu servislerin sözleşmesinde
          "kullanıcı verisi modeli eğitmek için kullanılmaz" maddesi var (zero data retention) ve
          biz bunu garanti ediyoruz.
        </li>
        <li>
          <strong>Saklama</strong>: Veriler Supabase (Frankfurt, AB sunucusu) ve Cloudflare R2'da
          şifreli saklanır.
        </li>
        <li>
          <strong>Analitik</strong>: Sadece anonim, toplu (örn: "kaç kullanıcı bu hafta podcast
          üretti") metrikler tutulur. Hiçbir kişisel davranış analizi yok.
        </li>
        <li>
          <strong>Reklam yok</strong>. Veri satışı yok. Üçüncü taraflarla paylaşım yok.
        </li>
      </ul>

      <h2>Verilerinin haklarını</h2>
      <p>Her zaman, her cihazdan:</p>
      <ul>
        <li>
          <strong>İndirebilirsin</strong> — Ayarlar → Hesap → Verilerini İndir. Tüm tablolarındaki
          her şey JSON olarak email'ine gelir (GDPR Art. 20).
        </li>
        <li>
          <strong>Silebilirsin</strong> — Ayarlar → Hesap → Hesabı Sil. 14 gün içinde geri
          alabilirsin. 14 gün sonra <em>tamamen</em> silinir, geri dönüşü yok (GDPR Art. 17).
        </li>
        <li>
          <strong>Düzeltebilirsin</strong> — Email veya ad soyad değişikliği için ayarlardan (GDPR
          Art. 16).
        </li>
        <li>
          <strong>Push'u kapatabilirsin</strong> — Cihaz ayarlarından veya app'ten (Ayarlar →
          Cihazlar).
        </li>
      </ul>

      <h2>Çocuklar (under 13)</h2>
      <p>
        Kavra 13 yaş altı kullanıcılar için tasarlanmadı. Eğer 13 yaşından küçükseniz veya bir
        çocuğun verisi yanlışlıkla toplandıysa lütfen{' '}
        <a href="mailto:privacy@kavra.app">privacy@kavra.app</a>
        adresinden bize ulaşın — derhal sileriz.
      </p>

      <h2>Pro abonelik</h2>
      <p>
        iOS'ta Apple, Android'de Google ödeme işlemcisidir. Kart bilgilerini biz görmeyiz. Web'de
        Stripe kullanılır. RevenueCat (3rd party), abonelik durumunu sync etmek için kullanılır ama
        kart bilgisi onlarda da yok.
      </p>

      <h2>Değişiklikler</h2>
      <p>
        Bu politika değişirse 30 gün önceden email ile bildiririz. App'te de banner ile gösteririz.
      </p>

      <h2>İletişim</h2>
      <p>
        Sorular, şikayetler, ya da sadece bir merhaba için:{' '}
        <a href="mailto:privacy@kavra.app">privacy@kavra.app</a>
      </p>

      <p className="text-sm text-slate-500 mt-8">
        Veri Sorumlusu: Kavra Technology Ltd · Maslak, İstanbul · KVKK Aydınlatma Metni için{' '}
        <a href="/privacy/kvkk">buraya bak</a>.
      </p>
    </main>
  )
}
