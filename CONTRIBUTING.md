# Pusula'ya Katkıda Bulunma

Teşekkürler! Pusula şu an private beta aşamasında — kod katkısı şu an dış geliştiricilere kapalı.
Bu doküman iç ekip referansıdır.

## Geliştirme Akışı

1. `main` her zaman deploy edilebilir olmalı
2. Feature branch'leri: `feat/<kısa-ad>`, bug: `fix/<kısa-ad>`, doküman: `docs/<kısa-ad>`
3. Conventional Commits zorunlu: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`, `perf:`
4. PR şablonu doldurulmadan merge edilemez
5. CI yeşil olmadan merge edilemez (lint + typecheck + test + build)
6. En az 1 review (solo dönemde: self-review checklist)

## Lokal Kurulum

```bash
pnpm install
docker compose up -d         # Postgres + Redis
cp apps/api/.env.example apps/api/.env.local
cp apps/web/.env.example apps/web/.env.local
cp apps/extension/.env.example apps/extension/.env.local
# Supabase değişkenlerini doldur
pnpm db:migrate
pnpm dev
```

## Kod Stili

- `pnpm lint` ve `pnpm typecheck` 0 hata olmalı
- `pnpm format` ile Prettier
- TypeScript strict mode (`exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`)
- Türkçe domain kavramları (ilan, mahalle, skorlama) Türkçe kalır; teknik tipler İngilizce
- Public API'lerde JSDoc; complex business logic'te inline comment

## Test

- `packages/scoring`: pure function → tablo testleri, deterministik
- `apps/api`: Nest controller + e2e
- `apps/extension`: jsdom fixture ile parser testleri
- Yeni feature → en az 1 mutlu, 1 mutsuz path testi
- Coverage hedef: %80 branch

## Skor Formülü Değişikliği

`SCORING_FORMULA_VERSION`'ı bump et (`packages/shared/src/constants/index.ts`). Mevcut
`scoring_results` kayıtları eski versiyon altında kalır; yeni kayıtlar yeni versiyonla
işlenir. ADR-001 ekine değişiklik gerekçesi yaz.

## DB Migration

`packages/db/migrations/` altına `NNNN_açıklama.sql` ekle. ID artar; mevcut migration'ı
değiştirme. RLS politikalarını unutma.

## Güvenlik

Açık bildirimi için `SECURITY.md` oku — GitHub Issue açma.
