# Faz 5 — Flashcard SM-2 + Quiz Engine + Error Portfolio

> Kavra artık sadece **anlatan** değil, **konsolide eden** bir sistem.
> Faz 4'te akıllı pedagojik kararlar veren engine'i kurduk; Faz 5'te öğrenmenin gerçek "kalıcı" hale geldiği döngüyü ekledik:
> ders → tekrar → quiz → hata analizi → tekrar düzeltme.

## Faz 5'in Üç Çekirdeği

### 1. SM-2 Aralıklı Tekrar (SuperMemo 2, Wozniak 1985)
Anki ve dünyanın en büyük tekrar uygulamalarının arkasındaki algoritma.

Her flashcard için 3 değişken: `easeFactor` (kolaylık, başlangıç 2.5), `intervalDays` (sonraki tekrar arası), `repetitions` (üst üste başarılı sayı).

Kullanıcı her tekrarda 0-5 arası kalite verir → mobile'da 4 buton (Tekrar/Zor/İyi/Kolay = 1/3/4/5):
- **quality < 3** (lapse) → repetitions sıfırlanır, kart yeniden öğrenmeye gider, **error_portfolio'ya kaydedilir**
- **quality ≥ 3** → ease faktörü güncellenir, interval büyür (1g → 6g → 6×ease ay)

`packages/engine/src/sm2.ts` ile **kütüphane bağımlılığı olmadan** native implementation. `previewIntervals()` UI'da 4 butonun altında "1g / 3g / 1ay / 3ay" gösteriyor — kullanıcı seçimini bilinçli yapsın diye.

### 2. AI Quiz Üretimi
3 kaynaktan quiz: **concept**, **document** (yüklenen PDF), **subject** (tüm konseptler).

Çıktı: 3-20 soru, **multiple choice + true/false + open ended + fill blank** karışık. Her soruda `explanation` da var — yanlışta öğretici dönüş.

Algoritma sıkı: Groq Llama 3.3 70B'ye **JSON mode** ile şu yapıda çıktı zorunlu:
```json
{
  "questions": [
    { "type": "multiple_choice", "prompt": "...", "choices": {a,b,c,d}, "correct_answer": "b", "explanation": "...", "difficulty": 3 }
  ]
}
```

Sorular `quiz_questions` tablosuna gizli `correct_answer` ile yazılır, GET endpoint'inde **kullanıcıya gönderilmez** (cheat koruması). Submit'te server tarafında karşılaştırılır.

### 3. Error Portfolio + 5 Whys
Her yanlış cevap **otomatik** olarak `error_portfolio`'ya yazılır:
- Quiz yanlışları
- Flashcard lapse'leri (quality < 3)
- (Manuel eklemeyi de destekliyor)

Kullanıcı hata kartına dokunup **"5 Neden ile Analiz Et"** der. AI yüzeydeki yanlıştan kök kavramsal eksiğe iniyor — ardışık 5 neden + öneri + ilgili konseptler. Her analiz `root_causes` JSON kolonuna yazılıyor (cache).

Bu sadece bir özellik değil; engine'in **`weak_spot`** context'inde **C1-misconception-mining** ve **C7-metaphorical-correction** behaviors'ı çağırması için sinyal kaynağı.

## Yeni Dosyalar

```
packages/db/supabase/migrations/
└── 0005_quiz_and_errors.sql           Quiz + errors + reviews + RPCs

packages/engine/src/
└── sm2.ts                             SM-2 algoritması (idempotent, test edilebilir)

apps/worker-llm/src/routes/
├── quiz.ts                            generate / get / submit
├── review.ts                          due / grade (SM-2) / stats
└── errors.ts                          list / 5 whys / resolve / subject stats

apps/mobile/src/hooks/
├── useQuiz.ts
├── useReview.ts
└── useErrors.ts

apps/mobile/app/
├── (tabs)/review.tsx                  Yenilendi — Anki tarzı dashboard
├── review/
│   ├── _layout.tsx
│   └── session.tsx                    SM-2 4 buton + interval önizleme
├── quiz/
│   ├── _layout.tsx
│   └── [id].tsx                       Çözme + sonuç ekranı (yanlış/doğru breakdown)
└── errors.tsx                         Hata kartları + 5 Whys

FAZ5-NOTES.md
```

## Güncellenen Dosyalar

- `packages/engine/src/index.ts` — SM-2 export
- `apps/worker-llm/src/server.ts` — 3 yeni route register
- `apps/mobile/app/_layout.tsx` — quiz/review/errors route'ları
- `apps/mobile/app/subject/[id]/index.tsx` — Quiz Üret butonu, gerçek stats, error uyarısı

## Akış Örneği (E2E)

1. **PDF yükle** → Faz 3 chunklara böler, embed eder
2. **Subject'e bağla** → Subject ekranında "Flashcard Üret" (Faz 3'ten gelen) → AI 15 kart üretir
3. **Tekrar tab'ı** → "Tekrara Başla" → SM-2 oturumu başlar
4. Her kartta:
   - Soruyu gör → tahmin et
   - Karta dokun → cevap görün
   - 4 butondan birini seç (Tekrar / Zor / İyi / Kolay)
   - Bir sonraki kart
5. **Quiz** → Subject ekranı → "Quiz Üret" → AI 8 soru hazırlar (~10 sn)
6. Quizi çöz → submit → sonuç + her sorunun açıklaması
7. Yanlış cevaplar → otomatik **error_portfolio**'ya
8. **Hata Portföyü** → bir hatanın "5 Neden" analizini iste → AI kök sebebi çıkarır
9. O konuda yeni ders aç → Faz 4 engine **weak_spot** context'ini tespit eder → **misconception-mining + metaphorical-correction** behaviors aktif → AI hatayı somutlaştırarak düzeltir
10. Hatayı "Çözüldü" işaretle → portfolio'dan çıkar

Bu döngü her tekrarda kullanıcının **anlama derinliğini** ölçer ve AI'nın **bandit arm'larını** günceller. **Kavra zaman içinde o kullanıcıya uyum sağlar.**

## Yeni RPCs

### `get_due_flashcards(user, subject?, limit)`
Şu an çalışılması gereken kartları döndürür:
- `next_review_at <= now()`
- Yeni kartlar (repetitions=0) ÖNCE
- Sonra en gecikmiş olanlar

### `get_subject_stats(user, subject)`
Tek RPC çağrısı ile subject'in tüm metriği:
- total/mastered concepts
- due/total flashcards
- total lessons + study minutes
- quiz_accuracy
- unresolved_errors
- last_lesson_at

## Kurulum

```bash
unzip kavra-faz5.zip && cd kavra
pnpm install

# Migration uygula
cd packages/db && pnpm supabase db push   # 0005 çalışacak
cd ../..

# Workers
pnpm dev:workers
pnpm dev:mobile
```

`.env` değişmedi — Faz 4 ile aynı (OPENAI_API_KEY hâlâ gerekli RAG için).

## Test Senaryosu

```bash
# 1. Subject + concept oluştur (mobile UI'da)
# 2. PDF yükle, ready olunca "Flashcard Üret" ile birkaç kart oluştur
# 3. Tekrar tab → kartları çalış
# 4. Subject'e geri dön → "Quiz Üret" → 8 soru çöz, bilerek 2-3 yanlış yap
# 5. Hata Portföyü → bir hataya bas → "5 Neden ile Analiz Et" → AI kök sebebi çıkarır

# 6. Yeni sohbet aç (aynı subject) → engine_decisions tablosuna bak:
psql ... -c "select detected_context, selected_behavior_codes from engine_decisions order by created_at desc limit 1"
# Beklenen: detected_context = 'weak_spot', behaviors içinde 'C1-misconception-mining' veya 'C7-metaphorical-correction'
```

## Bilinen Sınırlamalar

- **Open-ended quiz cevapları** string match (case-insensitive, noktalama temizliği). Anlamca eşit ama farklı yazılmış cevaplar yanlış sayılabilir. Faz 6'da semantic similarity ile çözülecek.
- **5 Whys analizi cache'siz** — her tıklamada yeni Groq çağrısı (cache'leniyor `root_causes` JSON'ında ama explicit "yeniden çalıştır" yok). Yeterli.
- **SM-2 ön-inceleme** sadece doğru cevap için doğru çalışıyor. "Tekrar" butonunda 1g gösterir; gerçekte aynı oturumda tekrar görünür. Anki davranışıyla aynı.
- **Quiz büyük subject'lerde context limiti** — 30+ concept'li subject'te tüm concept açıklamaları 8000 char'da kesilir. Daha büyükler için chunking gerekecek (Faz 6).

## Faz 5 Başarı Kriterleri

- [x] SM-2 doğru implementasyon (Wozniak orijinal formül)
- [x] 4 buton + sonraki interval önizlemesi
- [x] Quiz üretimi 3 kaynaktan (concept/document/subject)
- [x] 4 soru tipi (mc, tf, open, fill)
- [x] Submit sonrası yanlışlar otomatik error_portfolio'ya
- [x] Flashcard lapse → error_portfolio
- [x] 5 Whys AI analizi
- [x] Subject stats RPC'siyle gerçek metrikler
- [x] Engine entegrasyonu: weak_spot context'inde error_portfolio sinyal kaynağı

## Sonraki — Faz 6 (Reflections + Achievements + Pomodoro)

- Daily reflection + AI haftalık rapor
- Streak / achievement sistemi
- Pomodoro + focus mode
- WOOP goals (mental contrasting)
- Push notifications (review reminders)
- Open-ended quiz semantik karşılaştırma
