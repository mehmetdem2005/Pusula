# @kavra/mobile

Kavra Android uygulaması — Expo (React Native) + TypeScript.

## Geliştirme

```bash
# Kök dizinde
pnpm install

# Mobile app'i başlat
pnpm dev:mobile

# Android cihazına yükle (USB debug açık olmalı)
cd apps/mobile
pnpm android
```

## Build

```bash
# Preview APK (test için)
pnpm build:android:preview

# Production AAB (Play Store için)
pnpm build:android:prod
```

## Ortam Değişkenleri

`.env` dosyasını kök dizinde oluştur (`.env.example` referans):

```
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000
```

## Klasör Yapısı

- `app/` — Expo Router (file-based routing)
- `app/(auth)/` — Giriş/kayıt ekranları
- `app/(tabs)/` — Ana tab navigasyonu
- `app/settings/` — Ayarlar alt ekranları
- `src/lib/` — Supabase client, i18n
- `src/stores/` — Zustand stores
- `src/components/ui/` — Button, Input, vb.
- `locales/` — tr.json, en.json çevirileri
- `assets/` — Icon, splash (Faz 0'da eklenecek)
