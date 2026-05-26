# Sprint 6 — Sosyal & Gamification

> Yayın sonrası viral büyüme katmanı. Defter paylaşma + klan + liderlik
> + rozet sistemi + public profil. Retention 2-3x bekleniyor.

## 7 sistem teslim edildi

### 1. Migration `0014_social_layer.sql`
- **`profiles`** ext: username, bio, avatar_url, is_public, banner_color, pronouns
- **`follows`** — sosyal grafik (follower_id → following_id)
- **`notebooks`** ext: is_public, public_slug, view_count, save_count, allow_clone, category
- **`notebook_saves`** — yıldızla / fork tracking
- **`clans`** + **`clan_members`** + **`clan_messages`** — 10 kişilik study group + chat
- **`achievements`** + **`user_achievements`** — 23 önceden seed edilmiş rozet
- **`weekly_leaderboard`** materialized view (saatte bir refresh)
- Helper RPCs: `generate_notebook_slug`, `increment_notebook_views`, `user_public_stats`
- Trigger: `update_clan_member_count` (insert/delete)

### 2. Sharing Route `routes/sharing.ts`
- **POST `/api/notebooks/:id/share`** — public toggle + slug üret + category + allow_clone
- **GET `/api/n/:slug`** — anonim erişim (login gerekmez), source titles only, view++
- **POST `/api/notebooks/:id/save`** — toggle yıldız (save_count atomik)
- **POST `/api/notebooks/:id/clone`** — Pro-only deep copy (sources kopyalanır, chunks kullanıcı worker'ında işlenir)
- **GET `/api/gallery`** — popular/recent/most-saved sort, kategori filter, kategori dağılımı

**Privacy katmanı:** Public defter sadece source titles + metadata. Chunks ve full text **gösterilmez**. Chat history asla public. Studio outputs (özet/podcast) public erişilebilir (kullanıcı seçimi).

### 3. Clans Route `routes/clans.ts`
- **POST `/api/clans`** — klan kur (Free 1, Pro 5)
- **GET `/api/clans`** — kullanıcının klanları (membership listesi)
- **GET `/api/clans/discover`** — public klan keşif (search + sort)
- **GET `/api/clans/:slug`** — klan detay + üye listesi (haftalık skorlar)
- **POST `/api/clans/:id/join`** — public direkt, private invite_code
- **DELETE `/api/clans/:id/leave`** — founder hariç ayrılabilir
- **GET `/api/clans/:id/messages`** + **POST** — basit chat (5sn polling)

**Limitler:** Free üye 3 klana, Pro 10. Free klan 10 üye max, Pro klan 25 üye.

### 4. Social Route `routes/social.ts`
- **PATCH `/api/me/profile`** — username (regex `^[a-z0-9_]{3,20}$` unique), bio, pronouns, public toggle
- **GET `/api/profiles/:username`** — public profil + stats + 20 son defter + rozetler + follow status
- **POST `/api/profiles/:userId/follow`** — toggle
- **GET `/api/profiles/:userId/connections?type=followers|following`**
- **GET `/api/leaderboard?period=weekly&clanId=`** — global (materialized view) veya klan içi
- **GET `/api/achievements`** — tüm rozetler + isUnlocked flag
- **GET `/api/achievements/check`** — milestone check (reviews/streak/views/saves), batch upsert
- **POST `/api/achievements/event`** — manuel event (gece kuşu, ilk podcast, vb.)

### 5-7. Mobile UI — 8 yeni screen + 1 component

**Yeni screens:**
- **`gallery.tsx`** — Galeri keşfet, 12 kategori filter + 3 sort
- **`n/[slug].tsx`** — Public defter görüntüleyici (login optional), Save/Clone CTA
- **`u/[username].tsx`** — Public profil, banner color, stats, top 12 rozet, defter listesi
- **`clans.tsx`** — Mine + Discover tab, klan kurma modal (15 emoji, slug normalizer)
- **`clan/[slug].tsx`** — Klan detay, üye liderlik tabs + chat tabs (5sn polling)
- **`achievements.tsx`** — 5 kategori, rarity colored borders (common/rare/epic/legendary), progress bar
- **`leaderboard.tsx`** — Weekly/monthly toggle, "Senin Yerin" amber banner, top 100

**Yeni component:**
- **`ShareNotebookModal.tsx`** — Public toggle + allow_clone + 11 kategori + Clipboard.copy + RN Share API

## 23 Achievements (Seed)

**Milestone (4):** İlk Defter, Pro Geçti, Lifetime Kulübü, İlk Paylaşım
**Streak (4):** 7/30/100/365 gün — 🔥 🌙 💎 👑
**Learning (5):** 100/1000/10000 reviews + 100/1000 vocab
**Creator (4):** İlk Podcast, İlk Paylaşım, 100 Görüntüleme (Viral), 100 Save
**Social (2):** İlk Klan, Klan Kurucu
**Easter Eggs (2):** Gece Kuşu (02-05), Erken Kuş (05-07)

Rarity dağılımı: 14 common, 5 rare, 3 epic, 1 legendary.

## Mimari Kararlar (Sprint 6)

### Public deftere chunk içerik gösterme
Kaynaklarda telif haklı içerik olabilir → public deftere chunks dahil edilmez.
Sadece başlık + metadata. Klonlayan kullanıcı kendi kaynaklarını işler (worker fee'sini kendi öder).

### Slug generator (8 char custom alfabe)
`abcdefghijkmnpqrstuvwxyz23456789` — `0/1/l/o` çıkarıldı (görsel karışıklık).
32^8 = 1.1 trilyon kombinasyon. 5 deneme retry, hiç çakışma olmamalı.

### Materialized view weekly_leaderboard
Her sayfa açılışında query çekmek pahalı. Saatte bir REFRESH MATERIALIZED VIEW
ile snapshot al. Skor formülü: `reviews + active_days * 5` (gün içi tutarlılık aktif gün ödüllendirilir).

### Klan limitleri tier-based
Free: 1 founder, 3 join, 10 member. Pro: 5 founder, 10 join, 25 member.
Free'de küçük çekirdek topluluklar, Pro'da büyük klanlar — natural upsell.

### Founder kayrılamaz
"Founder ayrıl" → "Önce başka birine devret veya klanı sil." Klan sahipsiz kalmaması garanti.

### Chat moderation deferred
Sprint 5'te moderation route yazılmıştı. Chat post öncesi `moderateInternal(content)`
çağrılması gelecekte eklenebilir — şimdilik post-hoc moderation logu.

### View count race condition
`increment_notebook_views` RPC kullanılıyor → atomic UPDATE.
SELECT-then-UPDATE pattern yerine.

### Achievement check pattern
2 yol: (1) `/api/achievements/check` kullanıcı dashboard'a girince batch check,
(2) `/api/achievements/event` ile inline trigger ("first-podcast", "early-bird" vb.).
Threshold-based achievements check'le, event-based achievements event ile.

### Rarity color encoding
Border-only tint, opacity:0.4 locked. Anki/Genshin'den ilham — rarity tier'ları
bir bakışta anlaşılabilir olmalı.

## Maliyet (1000 Pro user/ay)

| Servis | Aylık |
|---|---|
| v1.1 baseline | $987-1337 |
| Supabase storage (avatar uploads) | $5 |
| Realtime (chat polling 5sn) | $0 (REST polling, no Realtime channel) |
| Materialized view refresh job | $0 (Supabase pg_cron free) |
| **Sprint 6 ek** | **$5** |

**Çok ucuz** — sosyal katman çoğunlukla DB indexes + RLS, ek servis yok.

## Sanity

- Toplam dosya: **390**
- Yeni: 12 dosya (4 backend + 8 mobile)
- Edited: 4 dosya (server.ts, _layout.tsx, package.json, render.yaml)
- API endpoints: 17 yeni
- Mobile route: 7 yeni
- Migration: 1 (0014, 23 achievement seed dahil)

## Kullanıcı Yolculukları

### "Public Defter Akışı"
1. User defterini açar → 3-nokta menü → "Paylaş"
2. ShareNotebookModal açılır → Public toggle ON → Kategori "Biology" → Klonlamaya izin ON
3. Backend slug üretir (örn `xk7q9mra`) → `kavra.app/n/xk7q9mra`
4. Linki Clipboard'a kopyalar veya RN Share API ile WhatsApp/Twitter'a yollar
5. "First Share" rozeti unlock olur 🎉
6. Arkadaşlar açar → view_count++, save_count++ atomic
7. 100 viewer = "Viral" rozet, 100 save = "100 Yıldızcı" rozet

### "Klan Kurma Akışı"
1. /clans → "Klan Kur"
2. Modal: emoji 🦁 seç → "Yeditepe Çalışkanları" → slug "yeditepe-calisanlari"
3. Klan kurulur → Founder otomatik member → System message "🦁 ... klanı kuruldu!"
4. "Klan Kurucu" rozet unlock
5. Founder davet kodunu paylaşır
6. Üyeler join → "X klana katıldı 👋" system message
7. Haftalık leaderboard'da klan içi sıralama görünür

### "Public Profil"
1. Kullanıcı /settings/account → username "ayse_okur" set
2. is_public = true toggle
3. /u/ayse_okur erişilebilir
4. Banner color + bio + pronouns
5. Stats: defter sayısı, görüntüleme, kayıt, takipçi
6. Top 12 rozet showcased
7. Public defter listesi (en son 20)

## Yeni deps

```json
"expo-clipboard": "~7.0.0"
```

## Yeni Env

Yok (mevcut env'lar yeterli).

## Sonraki

**Sprint 7 — Web parity + iPad** (~2 hafta)
Mobile-first ama Türk akademik kullanıcı bilgisayardan PDF açar. Web full feature parity + Supabase Realtime multi-device sync + iPad pencil + Mac Catalyst.

Bu sprint sonrası **3/4 detaylı plan tamam**, sadece B2B kalır.
