## Özet

<!-- Ne değişti, neden? 2-3 cümle yeter. -->

## Etki Değerlendirmesi

- [ ] Skor formülü değişti mi? (`SCORING_FORMULA_VERSION` bump edildi mi?)
- [ ] DB migration eklendi mi? (`packages/db/migrations/NNNN_*.sql`)
- [ ] Yeni env var mı? (`.env.example` ve `EnvSchema` güncellendi mi?)
- [ ] Public API'de breaking change mi? (CHANGELOG'a yazıldı mı?)
- [ ] Yeni client-side dependency mi? (bundle size etkisi düşünüldü mü?)
- [ ] Yeni izin / permission mi? (extension manifest, RLS policy)

## Test

- [ ] Birim test eklendi / güncellendi
- [ ] Manuel test yapıldı (adımlar: …)
- [ ] e2e testi etkilendi mi?

## Checklist

- [ ] `pnpm lint` ve `pnpm typecheck` lokal'de yeşil
- [ ] CHANGELOG.md `[Unreleased]` bölümü güncellendi
- [ ] PR başlığı Conventional Commit formatında (feat/fix/chore/docs/...)
- [ ] Self-review yapıldı
