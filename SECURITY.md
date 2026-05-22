# Güvenlik Politikası

## Desteklenen Sürümler

| Sürüm      | Destek |
| ---------- | ------ |
| 0.x (Beta) | ✅     |

## Açık Bildirimi

Bir güvenlik açığı bulduysanız **lütfen GitHub Issue açmayın.** `security@pusula.tr`
adresine PGP-şifreli e-posta gönderin.

PGP anahtarı: https://pusula.tr/.well-known/pgp-key.asc

### Bildiriminizde olması gerekenler

- Etkilenen bileşen (web / api / extension / scoring / db)
- Yeniden üretim adımları
- Etki değerlendirmesi (CVSS skoru yardımcı olur)
- (Opsiyonel) önerilen yama

### Yanıt taahhüdü

- İlk yanıt: 72 saat içinde
- Triage + onarım planı: 7 gün içinde
- Patch yayın: kritik açıklarda 14 gün hedef

### Bug Bounty

Resmi bug bounty programı henüz yok. Değerli bildirimler `SECURITY-HALL-OF-FAME.md`
listesine girer. Ticari katkılar için bireysel müzakere.

## Bilinen Saldırı Yüzeyi

- **BYOK key güvenliği:** Kullanıcı API key'leri client-side AES-GCM 256 ile şifrelenir.
  Master password kaybı = key kaybı. Server zero-knowledge.
- **Extension cookie erişimi:** `chrome.cookies.get` ile sadece `sb-access-token` okunur.
- **CORS allowlist:** Sıkı env-tabanlı; regex yok.
- **Rate limit:** Tüm endpoint'lerde Nest throttler; LLM endpoint'i daha sıkı.

## KVKK Uyumluluğu

Pusula KVKK kapsamında veri sorumlusudur. Detaylı politika:
https://app.pusula.tr/legal/kvkk
