# Changelog

Tüm önemli değişiklikler bu dosyada listelenir. Format
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) ve sürümler
[Semantic Versioning](https://semver.org/spec/v2.0.0.html) standardını izler.

## [Unreleased]

### Added

- Monorepo iskeleti (apps/web, apps/api, apps/extension, packages/\*)
- Deterministik kelepir skoru motoru (`packages/scoring`)
- Multi-provider LLM gateway: Groq, Gemini, DeepSeek, Anthropic
- BYOK (Bring-Your-Own-Key) AES-GCM 256 client-side şifreleme
- sahibinden konut detay parser (v3 selectors)
- Side panel React UI + içerik skript + service worker
- Supabase RLS şeması (`0001_init.sql`) + hardening (`0002_hardening.sql`)
- Render Blueprint + Vercel deploy config
- Kapsamlı dokümantasyon: ADR-001, skorlama modeli, mimari diyagram, roadmap, pazarlama

### Changed

- (henüz yok)

### Security

- JWT doğrulama Supabase JWKS ile gerçek RS256/ES256 imza kontrolü (önceki: dummy base64 decode)
- CORS allowlist artık env tabanlı (`CORS_ALLOWED_ORIGINS`); regex `*.vercel.app` kaldırıldı
- Gemini API key URL query yerine `x-goog-api-key` header'ında
- OpenAI-compat adapter'da `dangerouslyAllowBrowser` kaldırıldı — tüm LLM çağrıları backend proxy
- list-batch endpoint'ine Zod validation + 200 item / batch limiti
- `@nestjs/throttler` ile rate-limit
- `SCORE_BANDS` boşluk fix — 84.5 gibi ondalık skorlar artık doğru etiketlenir
- Random ID üretimi `crypto.randomUUID()` (önceki: `Math.random`)

## [0.0.1] - 2026-05-21

İlk MVP iskelet teslimi.
