# 05 — Frontend: Orb Reskin + UX (ui-ux-pro-max skill)

Dosyalar: `apps/web/app/globals.css` (.orb\*), `apps/web/app/sesli/page.tsx`.

## Sorun

Orb şu an `--gold*`/`--navy*` (eski tema) → yeni Modern Dark/IG nötr temayla çelişiyor. Rakipler (ChatGPT/Gemini) gecikme+barge-in+doğallıkta üstün; görselde nötr/zarif.

## Skill kullanımı (uygulama anında — ZORUNLU)

Orb + kontrol + altyazı tasarımından önce `ui-ux-pro-max` skill'i çalıştır (Modern Dark, "voice assistant / orb" deseni). `design-system/pusula/MASTER.md` referans. Çıktıyı bu doc'a işle.

## Reskin yönü

- Orb gradyanı: nötr → marka. Öneri: `radial-gradient(var(--c-brand) → var(--c-panel-soft))` + ince beyaz iç-glow; altın YOK. Token: yeni `--orb-*` veya doğrudan `--c-*`.
- Durum animasyonları korunur (breathe/spin/ripple) ama renk nötr; speaking'de mic/TTS seviyesiyle hafif ölçek.
- Arka plan `bg-night`, glass üst bar (geri + "Sesli mod" + yazılı sohbete geç).

## Bileşenler

- Orb (durum-güdümlü) · canlı altyazı (in/out) · büyük mic/stop FAB (bg-brand; recording=bg-danger pulse) · "Bağlanıyor/Hata" rozetleri · kbd ipucu (Space) · (ops.) mic cihaz seçici.
- a11y: `aria-live` altyazı, FAB `aria-pressed`, reduced-motion saygısı (mevcut globals'ta var).

## Doğrulama

Tarayıcıda golden-path + dark + mobil; orb nötr/temayla uyumlu; altyazı akıyor; FAB durumları doğru.
