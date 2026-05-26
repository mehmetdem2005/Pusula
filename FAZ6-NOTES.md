# Faz 6 — Reflections + Achievements + Focus Mode

> Faz 4-5'te **pedagojik zeka** ve **öğrenme konsolidasyonu** kurmuştuk.
> Faz 6 **davranışsal katman**: ritüel, motivasyon, ölçüm, süreklilik.
>
> Pedagojik literatürde (Dweck, Oettingen, Csikszentmihalyi, Cirillo), öğrenmenin kalıcılığı bilişsel değil — **davranışsal disiplin**. Faz 6 bu ayaklar üzerinde duruyor.

## Bu Faz'ın 5 Çekirdeği

### 1. Daily Reflection
Günlük 2-5 dakikalık yansıtma:
- Mood (1-5) + Energy (1-5) emojiyle
- "Bugün ne öğrendim?"
- "Neyle zorlandım?"
- "Yarın neye odaklanacağım?"

Bir günde **tek reflection** (upsert). Her gün yazmak **reflection_7** rozetini kazandırıyor — pozitif pekiştirme.

### 2. Weekly AI Report
Her pazartesi (veya kullanıcı istediğinde) AI haftalık rapor üretir:
- Sayısal metrikler: total_lessons, total_minutes, quiz_accuracy, en aktif konu, en verimli gün
- **AI narrative**: 3-5 paragraflık insan dilinde değerlendirme (Groq Llama 3.3 JSON mode)
- **AI recommendations**: 2-4 somut öneri

Rapor `weekly_reports` tablosunda cache'li — aynı hafta için ikinci POST zaten üretilmiş olanı döner.

### 3. Gamification: Streak + Achievements
- **Streak**: `lessons` tablosuna DB trigger → `status='completed'` olduğunda `streaks` tablosunu günceller. Ardışık gün mantığı, seri kırılırsa 1'e düşer, longest_streak hep korunur.
- **Achievements**: 23 preset rozet 5 kategoride (streak, volume, mastery, exploration, social). `check_achievements` RPC'si tüm metrikleri bir sorguda tarıyor, yeni kazanılanları döndürüyor. Dashboard'da uygulama açılışında otomatik kontrol, alert ile kullanıcıya bildirim.

Rozet örnekleri:
- 🌱 İlk Adım — ilk ders
- 🔥 Streak 3/7/30/100
- 🏆 Academik — 100 ders
- 💯 Mükemmel — bir quiz'den %100
- 🔍 Hatadan Öğrenen — 10 hatayı çözmek
- 🦉 Gece Kuşu / 🐦 Erkenci — saat bazlı keşif rozetleri

### 4. Focus Mode (Pomodoro)
Klasik Pomodoro: 25dk odak → 5dk mola, her 4 cycle sonra 15dk uzun mola.

Mimari kritik: **Timer ekran kapalıyken de doğru çalışsın** diye `setInterval` yerine `Date.now()` referans alıyoruz. Phase bittiğinde `focus_sessions` tablosuna kayıt, pomodoro_5 achievement tetikleniyor.

Ekran: tam ekran renk değişiyor (odak kırmızı, mola yeşil, uzun mola mavi), pulse animasyon, haptic feedback. Cycle göstergesi (4 nokta).

### 5. WOOP Goals (Mental Contrasting)
Gabriele Oettingen'in kanıtlanmış tekniği — sadece "Wish"i hayal etmek **başarı şansını azaltıyor**, ama engel + planla birleştirince 2x artırıyor:

- **W — Wish**: "Almanca B1 sınavını geçmek"
- **O — Outcome**: "Erasmus için Berlin'e gitmek"
- **O — Obstacle**: "Düzenli çalışmamak, ezber sıkıcı"
- **P — Plan**: "Eğer hafta içi 21'de olursam, Anki açacağım" (implementation intention)

Form 4 adımı ayrı sunar — kullanıcı engeli atlayamasın diye.

### Bonus: Push Notifications
- Expo Push Service ile token kaydı otomatik (oturum açıldığında)
- `/api/push/register` + `/api/push/send-review-reminder` endpoint'leri
- Cron scheduler ile (Faz 7'de) günlük 20:00 "X kart hazır" bildirimi

## Mimari Kararlar

### Neden DB trigger + RPC pattern?
Streak ve achievement mantığı **client'ta değil, DB'de**. Nedeni:
- Race condition yok (concurrent request'ler)
- Tek truth source
- Cron'la da tetiklenebilir
- Test edilebilir

`update_streak_on_lesson` trigger'ı, `check_achievements` RPC'si — bu pattern Faz 7-8-9'da da kullanılacak.

### Neden WeeklyReport cache
AI report üretmek ~8-12 saniye sürer, 3-4 Groq call. Haftada bir kullanıcı başına = ayda ~4 call. Cache'siz rescan'lerde maliyet patlar. `unique(user_id, week_start)` constraint idempotent.

### Pomodoro Native vs Timer
İlk iterasyonda `setInterval` kullandım, sonra **arka plana atıldığında timer duruyor**. Çözüm: `phaseEndAtRef = Date.now() + duration` absolute time. Her tick'te `Math.max(0, Math.floor((ref - Date.now()) / 1000))`. Pure ve doğru.

## Yeni Dosyalar

```
packages/db/supabase/migrations/
└── 0006_reflections_and_motivation.sql

apps/worker-llm/src/routes/
├── reflections.ts       Reflection upsert + weekly AI report
└── motivation.ts        Achievements, streak, focus, goals, push

apps/mobile/src/hooks/
├── useReflections.ts
├── useMotivation.ts
└── usePomodoro.ts       Native timer (Date.now bazlı)

apps/mobile/src/lib/
└── notifications.ts     Expo push setup + register/unregister

apps/mobile/app/
├── (tabs)/journal.tsx   YENİDEN YAZILDI — daily reflection
├── weekly-report.tsx
├── pomodoro.tsx
├── achievements.tsx
├── goals.tsx
└── _layout.tsx          Push registration eklendi
```

## DB

- `reflections`, `weekly_reports`, `goals`, `focus_sessions`, `push_tokens`, `achievements`, `user_achievements`
- `streaks` tablosu + `update_streak_on_lesson` trigger
- `check_achievements(user_id)` RPC — 23 rozet kontrolü tek çağrıda
- `get_weekly_metrics(user_id, week_start)` RPC — haftalık stat toplayıcı

## Kurulum

```bash
unzip kavra-faz6.zip && cd kavra
pnpm install
cd packages/db && pnpm supabase db push   # 0006 migration
cd ../.. && pnpm dev:workers
pnpm dev:mobile
```

Yeni deps: `expo-notifications`, `expo-device` — otomatik kuruldu.

## Test Akışı

1. **Streak başlat**: Bir ders tamamla → "Bitir" → rating ver. Dashboard'a dön → 🔥 1 gün.
2. **Rozet alma**: Dashboard açılırken otomatik `check_achievements` çağrılır. İlk kez ders yaptıysan `first_lesson` rozetini alırsın, alert popup çıkar.
3. **Daily reflection**: Journal tab → mood/energy + 3 soru doldur → kaydet. 7 gün üst üste yaz → `reflection_7` rozeti.
4. **Pomodoro**: Dashboard → Pomodoro → İlk Pomodoro'yu Başlat → 25dk çalış → otomatik 5dk mola → ... 5 tam cycle → `pomodoro_5` rozeti.
5. **Weekly report**: Journal → "Haftalık AI Raporun" → ilk kez açılınca otomatik üretim (~10sn) → AI narrative + öneriler.
6. **WOOP goal**: Profil → Hedeflerim → + Yeni Hedef → 4 adımı doldur → kaydet.
7. **Push**: Oturum açıldığında otomatik izin istenir. `/api/push/send-review-reminder` POST ile manuel test edilebilir.

## Bilinen Sınırlamalar

- **Push scheduling yok**: Cron Faz 7'de. Şu an sadece manual endpoint çalışıyor.
- **Weekly report max 1/hafta**: Cache var ama "yenile" butonu yeni AI call yapmıyor, cache dönüyor. Acil "yenile" için `--force` eklenecek (Faz 7).
- **Pomodoro arka plan audio yok**: Telefon sessize düştüğünde phase bitiş haptic gelmeyebilir. Faz 7'de local notification scheduling.
- **Achievement "first_quiz"** vb. "first" rozetleri gecikmeli — bir sonraki dashboard açılışında görünür. Real-time için her action sonrası check çağrılabilir ama trade-off.

## Faz 6 Başarı Kriterleri

- [x] Daily reflection mood + energy + 3 soru
- [x] Weekly AI report narrative + recommendations (JSON mode)
- [x] DB trigger ile streak
- [x] 23 preset rozet, 5 kategori
- [x] `check_achievements` RPC tek çağrıda tarar
- [x] Pomodoro 25+5+15 dakika cycling
- [x] WOOP 4 adımlı form
- [x] Expo push registration
- [x] Dashboard gamification stats (streak + rozet sayısı)

## Sonraki — Faz 7 (Pro + Voice Cloning + 3D)

- Stripe Pro subscription ($4.99/ay)
- F5-TTS ses klonlama (kullanıcı kendi sesini yükler → AI o sesle konuşur)
- 3D concept map (react-three-fiber)
- Cron scheduler (daily review reminder push)
- Force weekly report yenileme
- App lock (pin/biometric)
- Tema + renk kişiselleştirme
