# Faz 8 — Multi-Auth + Admin Panel + AI Image + Edge TTS + Custom Content

> Kavra'nın **kullanıcı yönetimi ve içerik genişleme** fazı. Çoklu giriş yöntemi,
> doğal sohbet, ücretsiz kaliteli ses, AI görsel üretimi ve süper admin paneli.

## Bu Faz'ın 12 Çekirdeği

### 1. Multi-Auth — 6 Provider

Tek bir uygulamada 6 farklı giriş yöntemi:

| Yöntem | Maliyet | UX |
|---|---|---|
| Magic Link (email) | Ücretsiz (Supabase) | En hızlı, şifre yok |
| Email + Şifre | Ücretsiz | Klasik, tanıdık |
| Telefon SMS OTP | Twilio ($0.0075/SMS) | Türkiye için ideal |
| Google OAuth | Ücretsiz (Supabase) | En tıklananlar |
| Apple Sign In | Ücretsiz | iOS yayını için zorunlu |
| Facebook (Instagram dahil) | Ücretsiz | Meta tek auth |

**Mobile**: `app/(auth)/sign-in.tsx` — 3 tab (Magic/Şifre/Telefon) + 3 OAuth buton.

**OAuth Setup**:
- Supabase Dashboard → Authentication → Providers
- Google: console.cloud.google.com'dan OAuth client ID
- Apple: developer.apple.com'dan Service ID + key
- Facebook: developers.facebook.com'dan App + Instagram Basic Display

### 2. OTP Sistemi

`POST /api/auth/otp/send` ve `/verify`:

- **6 haneli kod** (100000-999999)
- **bcrypt hash** ile DB'de saklanır (plaintext değil)
- **10 dk geçerli**, **5 deneme limit**
- **60sn rate limit** aynı identifier için
- Email: Resend (HTML template)
- SMS: Twilio

`otp_codes` tablosu — auto cleanup 24sa sonra.

### 3. Şifremi Unuttum (3 ekran)

`reset-password.tsx` → `verify-otp.tsx` → `new-password.tsx`

- Strength indicator (zayıf/orta/güçlü)
- Confirm password
- Reset token tek kullanımlık

### 4. Custom Subject + Concept Ekleme

**`SubjectCreator.tsx`** modal:
- **Önerilen tab**: 15 sistem önerisi (admin tarafından eklenebilir) — popüler grid + diğerleri
- **Custom tab**: İsim/açıklama + ikon (16 Lucide) ya da emoji + 15 renk paleti
- Live preview kart

**`ConceptCreator.tsx`** modal:
- Subject altında yeni kavram
- Zorluk 1-5 yıldız
- Açıklama ops.

`suggested_subjects` tablosu — admin yönetiyor (`/api/admin/suggested-subjects`).

### 5. Lucide SVG Icon System

**`Icon.tsx`** — ~120 icon mapped:
- Navigation, tab, actions, auth, learning, voice, documents, time
- Subject icons (calculator, flask, dna, atom, languages, palette, music...)
- Brand (Apple, Facebook, Instagram, Google, GitHub)

```tsx
<Icon name="brain" size={20} color="#1E1B4B" />
```

Emojiler artık **sadece**:
- Subject avatar (kullanıcının seçtiği — 🇩🇪 🧮 ⚗️)
- Mood/Energy ölçeği (😊 🪫 ⚡)
- Achievement rozetleri (🏆 🔥)
- Sohbette doğal text emojiler (`:)` `xd` `:(` `;)`)

### 6. Doğal Sohbet Emojileri

Engine `prompt-compiler.ts` `BASE_IDENTITY`'e doğal stil rehberi eklendi:

```
İFADE STİLİ — DOĞAL VE SAMİMİ:
• Çoğu zaman text emoji kullan: :), :D, :(, :/, ;), xd
• AŞIRI EMOJİ KULLANMA — bir mesajda en fazla 1-2 yerde
• Resmi grafik emojiler (🎯 📊) sadece konu başlıklarında
• Anlayış: :), Sorgulama: :/, Empati: :(, Heyecan: :D ya da !
• Bir arkadaş gibi yaz, AI gibi değil

YANLIŞ: "Harika bir soru! 🎉🚀✨ Birlikte ele alalım! 💪"
DOĞRU: "Güzel soru :) Önce şuradan başlayalım — türev nedir?"
```

### 7. Edge TTS — Microsoft Edge Ücretsiz Neural

**`edge-tts.ts`** — Microsoft Edge tarayıcısının kullandığı public TTS API:

- WebSocket protokolü ile bağlanır
- Türkçe sesler: **Emel** (kadın), **Ahmet** (erkek)
- 70+ dil desteği (EN/DE/FR/ES/IT/JA/AR vs)
- Speed/pitch/volume kontrol (-100 .. +100)
- Tamamen ücretsiz, rate limit yok
- MP3 output (24kHz, 48kbps)

Google'ın varsayılan robot sesinden çok daha doğal.

### 8. ElevenLabs Pro Altyapı

**`elevenlabs.ts`** — Pro tier için:

- Multilingual sesler (Charlotte, Charlie, Lily, George)
- Stream desteği (uzun metinler için)
- Voice settings (stability, similarity, style)
- Maliyet: ~$0.30/1000 karakter
- Model: `eleven_multilingual_v2` (Türkçe destekli)

### 9. Synthesize V2 — Engine Seçimi

`POST /api/voice/synthesize/v2`:

```typescript
{ engine: 'edge' | 'piper' | 'elevenlabs' | 'clone' }
```

| Engine | Tier | Kalite | Hız |
|---|---|---|---|
| `edge` (default) | Free | Yüksek | ~2sn |
| `piper` | Free | Orta | ~1sn |
| `elevenlabs` | Pro | En yüksek | ~3sn |
| `clone` | Pro+ | Kişisel | ~5sn |

`requirePro` guard ile elevenlabs/clone Pro değilse 403.

### 10. AI Image Generation

`POST /api/ai-images/generate`:

- **Replicate Flux Schnell** ($0.003/image, ~3sn)
- **Replicate Flux Dev** (kaliteli, ~15sn, 2 kredi)
- 5 aspect ratio (1:1, 16:9, 9:16, 4:3, 3:4)
- Prompt refinement (educational illustration style)
- Supabase Storage'da kalıcı saklama
- Aylık kota: Pro 100 / Lifetime 200

**Mobile**: `ImageGeneratorModal.tsx` — sohbette tap → görsel üret → "Sohbete Ekle".

### 11. Super Admin DB Trigger

İlk kayıt olan kullanıcı otomatik super_admin olur:

```sql
create function assign_first_user_super_admin()
returns trigger as $$
begin
  if (select count(*) from profiles) = 1 then
    update profiles set role = 'super_admin' where id = new.id;
  end if;
  return new;
end;
$$ language plpgsql;
```

`role` enum: `super_admin` / `admin` / `user`.

`is_admin()` ve `is_super_admin()` SQL helper functions — RLS policies için.

### 12. Admin Panel — 5 Ekran

**`app/(admin)/`** route group, role guard ile:

#### Dashboard (`dashboard.tsx`)
- Toplam/yeni/Pro kullanıcı sayıları
- Toplam ders/PDF/kütüphane sayıları
- 4 quick action (Users, Library, Audit, Suggested)

#### Users (`users.tsx`)
- Search (email/isim)
- Role filter (Tümü/Super/Admin/User)
- Pagination
- Avatar rengi role'e göre (Super=amber, Admin=ink, User=gri)
- Pro crown badge

#### User Detail (`users/[id].tsx`)
- Stats (ders/konu/PDF/streak)
- Auth providers + verify status
- Role değiştirme (super_admin only)
- Ban/unban (reason zorunlu)

#### Library (`library.tsx` + `library/upload.tsx`)
- Kategori chip'leri (textbook/exam_prep/reference/novel/other)
- PDF upload (DocumentPicker → signed URL → Supabase Storage)
- Etiket sistemi (Almanca, A2, vs)
- Pro-only toggle
- Download count

#### Audit (`audit.tsx`)
- Son 200 admin aksiyonu
- Action ikonları renk kodlu (rol değişti = mor, ban = kırmızı, upload = ink)
- Metadata gösterimi
- Tarih/saat

#### Suggested Subjects (`suggested-subjects.tsx`)
- Onboarding'de görünecek ders önerilerini yönet
- Featured (popüler grid'de) toggle
- Renk + ikon/emoji seçici

## Database Migration `0008_admin_and_auth.sql`

- `profiles.role`, `phone_number`, `phone_verified_at`, `auth_providers`, `banned_at`
- `is_admin()`, `is_super_admin()` SQL functions
- `assign_first_user_super_admin` DB trigger
- `otp_codes` tablosu (bcrypt hash)
- `admin_audit_logs` tablosu
- `library_documents` + `library_downloads` + storage bucket
- `suggested_subjects` (15 seed)
- `ai_images` + storage bucket
- `usage_quotas.ai_images_generated` ek kolon
- `subjects.is_custom`, `custom_icon_name`, `emoji` ek kolonlar

## Yeni Env Değişkenleri

```bash
# Email OTP
RESEND_API_KEY=re_...

# SMS OTP
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM_NUMBER=+1...

# AI Image
REPLICATE_API_TOKEN=r8_...

# Pro TTS
ELEVENLABS_API_KEY=sk_...
```

## Yeni Dosyalar (Faz 8'in tümü)

```
packages/db/supabase/migrations/
└── 0008_admin_and_auth.sql              # 340 satır

apps/worker-llm/src/routes/
├── auth.ts                              # OTP + password reset + logout
├── admin.ts                             # Dashboard + users + library + audit
└── ai-images.ts                         # Replicate Flux generation

apps/worker-voice/src/
├── edge-tts.ts                          # Microsoft Edge WebSocket TTS
├── elevenlabs.ts                        # Pro TTS
└── routes/synthesize-v2.ts              # Engine seçici

apps/mobile/src/
├── components/ui/Icon.tsx               # Lucide icon system (~120)
├── components/subjects/SubjectCreator.tsx
├── components/subjects/ConceptCreator.tsx
├── components/ai-images/ImageGeneratorModal.tsx
├── hooks/useAdmin.ts                    # 10+ admin hooks
└── hooks/useAIImages.ts

apps/mobile/app/(auth)/
├── sign-in.tsx                          # 6-provider login
├── sign-up.tsx
├── verify-otp.tsx                       # 6-digit OTP input
├── reset-password.tsx
└── new-password.tsx

apps/mobile/app/(admin)/
├── _layout.tsx                          # Role guard
├── dashboard.tsx
├── users.tsx
├── users/[id].tsx
├── library.tsx
├── library/upload.tsx
├── audit.tsx
└── suggested-subjects.tsx
```

## Test Akışı

```bash
unzip kavra-faz8.zip && cd kavra
pnpm install
cd packages/db && pnpm supabase db push   # 0008 migration
cd ../.. && pnpm dev:workers
pnpm dev:mobile
```

### Multi-Auth Test
1. Sign-in ekranında "Magic Link" tab → email gir → e-postana link gelir
2. "Şifre" tab → e-posta + şifre → "Şifremi unuttum"
3. "Telefon" tab → +905XX numara → SMS kod → verify

### Admin Test
1. İlk kullanıcı olarak kayıt ol → otomatik super_admin
2. Profile → "⚡ Super Admin" → Yönetim Paneli
3. Users → kullanıcı detay → role değiştir, ban/unban
4. Library → "+Yükle" → PDF seç → kategori/etiket → Pro toggle
5. Audit → tüm aksiyonlar logged

### AI Image Test (Pro)
1. Lesson ekranı → "✨" butonu (Pro guard)
2. "Türev kavramını anlatan grafik" → Generate
3. Sonuç görünür → "Sohbete Ekle" → chat'te inline render

### Edge TTS Test
1. Voice settings → engine: "Edge"
2. Sesli ders başlat → konuş → AI cevap → sesli oku
3. Google'ın robot sesinden çok daha doğal

## Mimari Kararlar

### Neden Edge TTS varsayılan?
Microsoft Edge tarayıcısının ücretsiz neural TTS'i. Google'ın robot sesinden çok daha kaliteli, rate limit yok, 70+ dil. Tek sorun: undocumented public API (Microsoft her an kapatabilir). ElevenLabs'a Pro gardı eklenmiş, fallback olarak Piper var.

### Neden 3 katmanlı TTS?
- Free: Edge (kaliteli + ücretsiz)
- Pro: ElevenLabs (en doğal)
- Pro+: F5-TTS Voice Cloning (kişisel)

Free → Pro upgrade için anlamlı kalite atlama (Edge → ElevenLabs).
Pro → Pro+ için kişiselleştirme atlama (multilingual sesler → kendi sesim).

### Neden DB trigger ile super_admin?
İlk kayıt güvenli — race condition yok. Manual SQL çalıştırma gerekmiyor. Production'da ilk admin kim olursa olsun (sen olacaksın), trigger garanti eder.

### Neden Lucide icons?
- Tutarlı stroke width
- Tema rengi alır (currentColor)
- Tree-shakeable (bundle size küçük)
- 1500+ icon
- TypeScript native

Emojiler ekran çözünürlüğüne göre değişir, tema rengi almaz, kültürel anlam taşır. Sadece anlamlı yerlerde (avatar/mood/achievement/chat).

### Neden Replicate Flux Schnell?
- Flux Schnell = $0.003/image (en ucuz kaliteli)
- Flux Dev = $0.012/image (daha kaliteli, daha yavaş)
- Pro user 100/ay = $0.30 ekstra maliyet
- Lifetime user 200/ay = $0.60 ekstra maliyet

Marj %95+ korunuyor.

## Kalan Sınırlamalar

- **Instagram standalone login**: Meta'nın yeni Threads/Instagram API gerekiyor (basic display deprecated). Şimdilik Facebook auth Instagram için yeterli (aynı Meta hesabı).
- **Edge TTS production riski**: Microsoft public API; günde milyon istekte kapatabilir. Production'da Azure TTS'e ($1/1M karakter) geçiş hazır.
- **AI image content moderation yok**: Replicate'in kendi safety filter'ı var ama Türkçe prompt için ek filter eklenmeli (Faz 9).
- **OTP SMS Türkiye fiyatı**: Twilio Türkiye SMS'i $0.0075/msg → 1000 user × 2 OTP/ay = $15/ay. Alternatif: Iletimerkezi.com (Türkiye'ye özel, daha ucuz).

## Faz 8 Başarı Kriterleri

- [x] 6 auth provider (Email/Magic/SMS/Google/Apple/Meta)
- [x] OTP akışı (bcrypt hash + rate limit)
- [x] Şifremi unuttum 3-step
- [x] Custom subject + concept (ikon/emoji/renk)
- [x] Lucide icon system (~120 icon)
- [x] Edge TTS (Türkçe Emel/Ahmet)
- [x] ElevenLabs Pro altyapı
- [x] AI image generation (Replicate Flux + 100/200 kota)
- [x] Super admin auto-trigger (ilk kayıt)
- [x] Admin panel (Dashboard/Users/Library/Audit/Suggested)
- [x] Doğal sohbet emojileri (engine prompt)
- [x] Lucide SVG iconlar her yerde

## Faz 9 (Sonraki) — Sosyal + Yayın

- iOS App Store + Google Play yayın hazırlık
- RevenueCat entegrasyonu (in-app purchase Apple/Google %30 koşulu)
- Sosyal: arkadaş ekleme, study groups
- Open-ended quiz semantic comparison (embedding similarity)
- AI image moderation (Türkçe NSFW filter)
- Multi-device sync (offline → online merge)
- Türkiye SMS provider (Iletimerkezi)
