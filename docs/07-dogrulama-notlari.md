# Doğrulama Notları & Devam Aksiyonları

**Date:** 21 Mayıs 2026
**Scope:** Bu teslimat paketinin tutarlılık kontrolü, bilinen eksiklikler ve sıradaki adımlar.

---

## ✅ Tutarlılık Kontrolü

| Karar / İddia                                        | ADR | Roadmap | Skorlama | Provider Mat. | Mimari Dia. |     Kod      |  Durum  |
| ---------------------------------------------------- | :-: | :-----: | :------: | :-----------: | :---------: | :----------: | :-----: |
| Hibrit Web + Extension                               | ✅  |   ✅    |   n/a    |      n/a      |     ✅      |      ✅      | Tutarlı |
| User-Assisted Ingestion (sahibinden)                 | ✅  |   ✅    |   n/a    |      n/a      |     ✅      |      ✅      | Tutarlı |
| Multi-Provider BYOK (Groq/Gemini/DeepSeek/Anthropic) | ✅  |   ✅    |   n/a    |      ✅       |     ✅      |      ✅      | Tutarlı |
| Deterministik skorlama + LLM açıklama                | ✅  |   ✅    |    ✅    |      ✅       |     ✅      |      ✅      | Tutarlı |
| Beta=BYOK, V2=Subscription                           | ✅  |   ✅    |   n/a    |      ✅       |     ✅      | ✅ (DB şema) | Tutarlı |
| Skor formülü `0.45·FA + 0.25·Q + 0.20·L + 0.10·R`    | ✅  |   n/a   |    ✅    |      n/a      |     n/a     |      ✅      | Tutarlı |
| Yüksek risk skor cezası (RiskSkoru<25 → ×0.7)        | ✅  |   n/a   |    ✅    |      n/a      |     n/a     |      ✅      | Tutarlı |
| TBDY 2019 + AFAD risk bantları                       | n/a |   ✅    |    ✅    |      n/a      |     n/a     | ✅ (risk.ts) | Tutarlı |

---

## ⚠️ Bilinen Eksiklikler / Sonraki İterasyonda

### 1. UI bileşen kütüphanesi (shadcn/ui) henüz bootstrap edilmedi

Web app sayfaları basit Tailwind classes ile yazıldı. shadcn/ui kurulumu (`npx shadcn@latest init`) sonra yapılacak. MVP'de gerek yok ama AAA UX için kritik.

### 2. Test kapsamı kısıtlı

`packages/scoring/test/scoring-engine.test.ts` 7 case içeriyor. ADR'da bahsedilen "50+ birim test" hedefine ulaşmak için ekstra coverage gerekli:

- `quality.ts` tek tek mapping fonksiyonları
- `location.ts` mesafe band'leri
- `risk.ts` TBDY logic, tapu durum kombinasyonları
- `price-advantage.ts` outlier filtering edge cases

### 3. Comparable set query gerçek değil

`IlanlarService.ingestKonut` MVP'de `comparables: []` veriyor. Gerçek Postgres query'si (mahalle + ±20% m² + 90 gün) yazılmalı. Bu işlem, ilk 100 ilan ingest edildikten sonra anlamlı olacak.

### 4. AFAD/TÜİK enrichment job'u yok

`mahalle_enrichment` tablosu var ama dolduran job yok. BullMQ + cron ile:

- TÜİK CSV import scripti (ilk seed)
- AFAD PGA lookup web service (varsa) veya statik shapefile import
- OpenStreetMap Nominatim/Overpass cache

### 5. Web auth bridge implementasyonu sade

`apps/api/src/auth/jwt.guard.ts` "dummy decode" yapıyor — Supabase JWKS ile gerçek RS256 doğrulama eklenecek. MVP private beta'da sorun değil, public beta öncesi şart.

### 6. Streaming SSE tam tasarımlanmadı

Extension → service worker → backend → LLM streaming akışı SidePanel.tsx'te non-streaming gibi yazıldı. SSE veya WebSocket geçişi V0.2'de.

### 7. Master password recovery yok

Master password kaybı = tüm BYOK key'leri kaybı. Recovery code (16-haneli) flow'u eklenecek; key blob'lar 2 farklı türetilmiş anahtarla (master + recovery) şifrelenir.

### 8. Hukuki review pending

`user-assisted ingestion` konumlanması bir avukat tarafından gözden geçirilmeli (KVKK + sahibinden ToS). Bu, public beta öncesi engellemiyor ama yasal risk parametresinde.

---

## 🚀 Mehmet için Hızlı Başlangıç

```bash
# 1. Outputs/kelepir klasörünü kendi geliştirme makinene kopyala
cp -r outputs/kelepir ~/projects/kelepir
cd ~/projects/kelepir

# 2. Bağımlılıklar
pnpm install

# 3. Postgres + Redis aç
docker compose up -d

# 4. Supabase projesi oluştur (https://supabase.com)
#    - .env dosyalarına URL ve key'leri kopyala
#    - packages/db/migrations/0001_init.sql'i SQL Editor'da çalıştır

# 5. Dev sunucuları (3 terminal)
pnpm --filter @kelepir/api dev      # :3001
pnpm --filter @kelepir/web dev      # :3000
pnpm --filter @kelepir/extension dev # chrome://extensions → Load unpacked

# 6. Test
pnpm --filter @kelepir/scoring test

# 7. İlk gerçek deneme
# - Chrome'da http://localhost:3000 → kayıt ol
# - Settings'e gel, en az 1 provider key gir
# - Extension'ı yükle (chrome://extensions → Developer mode → Load unpacked → apps/extension/dist)
# - sahibinden.com/ilan/... gibi bir url'i aç
# - Sağ altta "🏠 Kelepir Analiz" butonu görünmeli
```

---

## 📂 Çıktı Manifesti

| #    | Dosya                            | Kullanım                                                                               |
| ---- | -------------------------------- | -------------------------------------------------------------------------------------- |
| 01   | `01-mimari-ve-yol-haritasi.md`   | Ön taslak (önceki konuşmadan)                                                          |
| 02   | `02-ADR-001-mimari-kararlar.md`  | **ADR** — Mimari kararlar + Multi-provider LLM Gateway eki + V2 ticarileşme detayları  |
| 03   | `03-skorlama-modeli.md`          | **Skor formülü** + parametre listeleri + LLM açıklama protokolü                        |
| 04   | `04-provider-model-matrisi.md`   | **Provider × Model** karşılaştırma + Settings UI spec'i                                |
| 05   | `05-sistem-mimarisi-diyagram.md` | **C4-style Mermaid** diyagramlar (Context, Container, Component, Sequence, Deployment) |
| 06   | `06-roadmap.md`                  | **Roadmap** — MVP/V1/V2/V3 + Subscription epic + KPI hedefleri                         |
| 07   | `07-dogrulama-notlari.md`        | Bu dosya                                                                               |
| repo | `kelepir/`                       | **Monorepo iskelet** (pnpm + Turborepo)                                                |

---

## 🔮 Sonraki Karar Noktaları

Mehmet'in bu paket üzerinden gözden geçirip karar vermesi gerekenler:

1. **Repo ismi** — "kelepir" mi başka mı? Domain müsait mi?
2. **Marka & logo** — şu an "🏠 Kelepir" emoji + isim. Profesyonel logo tasarımı (V0.2)
3. **GitHub org** — public mi private mi (private önerim)
4. **Supabase projesi** açılışı
5. **Sentry + PostHog** account
6. **Domain** alımı (kelepir.tr / kelepir.app / kelepir.io)
7. **Hukuk** — sahibinden ToS review (avukat)
8. **Pilot kullanıcı** — Mehmet'in ağında 3-5 emlakçı, beta v0.1 için
