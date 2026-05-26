# Faz 4 — Teaching Engine + Concept Map + RAG

> Kavra'nın kalbi. Her kullanıcı mesajına context-aware, kişiselleşen, öğrenen bir pedagojik karar alma katmanı.

## Özet — Bu Fazda Ne Değişti

Önceki fazlarda Kavra basit bir LLM wrapper'ıydı: tek ve sabit system prompt, kişilik seçimi, kullanıcının yazdığı şeye yanıt. Bu Fazdan itibaren her mesaj **10 katmanlı bir karar mimarisinden** geçiyor:

```
Kullanıcı Mesajı
        ↓
1.  Snapshot (user state + concept state)
2.  Context Detection (first_exposure / practice / review / ...)
3.  Intent Classification (Groq Llama-3.1-8b cache'li)
4.  Candidate Selection (150 teknikten ~10'a süz)
5.  Hard Filter (cognitive load, fatigue, blocked)
6.  Thompson Sampling Bandit (kullanıcıda hangi teknik iyi çalışıyor)
7.  Behavior Layer (15 gizli pedagojik taktikten uygun olanları)
8.  RAG (kullanıcının PDF'lerinden ilgili chunk'lar)
9.  Prompt Compilation (kişilik + teknik + behaviors + RAG)
10. Decision Logging (engine_decisions audit)
        ↓
LLM Yanıt (streaming) + meta event (UI'a karar görünür)
        ↓
Ders Sonu Rating → Bandit Update (kullanıcıda öğrenir)
```

## Mimari — `packages/engine/`

Tek sorumluluk, test edilebilir, worker'lardan import edilebilir bir paket:

| Modül | Sorumluluk | Satır |
|---|---|---|
| `types.ts` | Tüm interface'ler | ~150 |
| `context-detector.ts` | Mesaj + user → context + intent | ~180 |
| `candidate-selector.ts` | Context → aday teknikler (CONTEXT_TO_TECHNIQUES map) | ~110 |
| `filter.ts` | Hard filter: blocked, fatigue, late hour | ~70 |
| `bandit.ts` | Thompson Sampling (Marsaglia-Tsang Gamma) | ~210 |
| `behaviors.ts` | 15 BEHAVIOR + orchestrator | ~190 |
| `rag.ts` | OpenAI embed + pgvector RPC | ~140 |
| `technique-library.ts` | 30+ tekniğin systemPromptFragment | ~220 |
| `prompt-compiler.ts` | Tüm parçaları birleştirip son prompt | ~110 |
| `engine.ts` | Facade — `decide()` + `recordOutcome()` | ~340 |
| `index.ts` | Public API | ~10 |

**Toplam: ~1730 satır TypeScript**

### Niye Thompson Sampling?

Multi-armed bandit problemler için 2 ana yaklaşım var: ε-greedy ve UCB. Thompson Sampling (TS) ikisinden de matematiksel olarak üstün:

- **TS doğal regularizer içerir** — yeni arm'lar otomatik exploration alır (Beta(1,1) cold start = uniform), zamanla exploitation'a kayar.
- **Uncertainty-aware** — sadece "ortalaması yüksek" olanı seçmiyor, "yüksek olabilir" olanları da deneme şansı veriyor.
- **Bayesyen** — her gözlem (rating) posterior'ı günceller, prior bilgi enkode edilebilir.

`bandit.ts`'deki `sampleGamma` fonksiyonu Marsaglia-Tsang (2000) metodunu uyguluyor — k≥1 için reddetme örneklemesi, k<1 için boost formülü. Box-Muller normal sample. Bu çok hassas matematik bir kütüphane çağırmadan native yapıldı.

### Behaviors — Niye Ayrı Katman?

Pedagojik literatürde 100+ "engine behavior" var (Peak-End, IKEA Effect, Scaffolding Fading, Misconception Mining, Reappraisal...). Bunları "teknik" olarak kullanıcıya sunmak yanlış olur — bunlar öğrenciye söylenmeyen, arka planda uygulanan taktikler.

Bu yüzden:
- **Techniques (M1-M7)**: Öğrenciye görünür ana yöntem (Feynman, SQ3R, Sokratik) → Bandit seçer
- **Behaviors (C1-C10)**: Gizli taktik → Kural tabanlı orchestrator seçer (max 3 aktif)

Her iki katman birleşip son system prompt'u oluşturur. Behaviors kural tabanlı çünkü deterministik ve hızlı; bandit'e gerek yok — "ders sonuysa Peak-End uygula" gibi.

### RAG — Pgvector + OpenAI Embeddings

Kullanıcı PDF yüklediğinde:
1. Chunk'lara bölünür (~2000 char, 200 overlap)
2. OpenAI `text-embedding-3-small` ile vektöre dönüşür (1536 dim)
3. `document_chunks.embedding` pgvector kolonuna yazılır

Engine her decide çağrısında:
1. Kullanıcı mesajını embed eder
2. `match_document_chunks` RPC'sini çağırır (cosine similarity threshold=0.72)
3. Top 4 chunk'ı sayfa numarasıyla prompt'a enjekte eder
4. LLM "X kitabının 12. sayfasında..." diye atıf yapabilir

Concept'ler de ayrıca embed edilir (`/api/concepts/:id/embed` endpoint'i) — gelecek RAG aramaları için.

## DB Migration `0004_teaching_engine.sql`

Yeni tablolar:
- **`technique_arms`**: `(user_id, technique_id) → alpha, beta, total_uses, avg_rating`. Bandit state.
- **`engine_decisions`**: Her ders kararının audit log'u — context, candidate count, selected technique, active behaviors, bandit score, reasoning JSON.
- **`intent_cache`**: Mesaj hash → intent (30 gün cache, Groq çağrısını azaltır).

Yeni alanlar:
- `progress.confidence` (0-1)
- `progress.last_context`
- `subjects.exam_date` + `total_study_minutes`

Yeni RPC'ler:
- `match_document_chunks(query_embedding, user_id, subject_id, threshold, count)` — RAG için
- `match_concepts(query_embedding, user_id, subject_id, threshold, count)` — concept similarity

## Mobile UI Eklemeleri

### Engine Badge (`components/chat/EngineBadge.tsx`)
Her asistan yanıtında üstte küçük badge:
```
🌱 İlk karşılaşma · Feynman
   + 2 gizli taktik · 📄 3 referans  ⓘ
```
Tıklayınca tam decision detayı (modal). Şeffaflık + güven inşası.

### Rate Lesson Modal (`components/lesson/RateLessonModal.tsx`)
Ders bitince 1-5 yıldız + (3'ten düşükse) kısa yorum. Submit edilince `/api/engine/outcome` çağrılır → bandit arm'ı güncellenir → bir sonraki sefer o teknik daha az / çok seçilir.

### Subject CRUD (`app/(tabs)/learn.tsx`, `app/subject/[id]/index.tsx`)
- 12 ikon × 9 renk picker ile subject oluşturma
- Stats: kavram sayısı, toplam çalışma, sınav günleri (kırmızı eğer ≤14 gün)
- Concept ekleme (auto-embed background call)
- Sınav tarihi quick picker (7/30/90 gün)

### 2D Concept Map (`app/subject/[id]/map.tsx`)
react-native-svg ile force-directed layout:
- **Repulsion** (Coulomb) — node'lar birbirinden iter
- **Attraction** (Hooke) — prerequisite edge'ler bağlı node'ları çeker
- **Center gravity** — hepsini ortaya çeker
- **120 iterasyon** sonrası stabilize olur
- Node radius mastery'ye göre büyür (20-40px)
- Renk: yeşil (>%70), amber (%40-70), subject color (yeni)
- Tap → detail card alttan açılır

### Lesson Chat v4
- Engine badge entegre
- "Bitir" butonu → mesaj sayısı ≥3 ise rating modal, değilse direkt back
- TTS auto-play toggle, sesli derse geçiş, model + kişilik picker'lar (Faz 1-2'den taşındı)

## Kurulum

```bash
# 1. Çıkar
unzip kavra-faz4.zip
cd kavra

# 2. Kur (engine paketi otomatik linklenir)
pnpm install

# 3. .env hazırla — kritik yeni değişken: OPENAI_API_KEY (RAG için)
cp .env.example .env
# Doldur:
#   - NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
#   - MASTER_ENCRYPTION_KEY (32 byte hex — openssl rand -hex 32)
#   - OPENAI_API_KEY  ← YENİ, embeddings için
#   - EXPO_PUBLIC_API_BASE_URL
#   - EXPO_PUBLIC_VOICE_BASE_URL (Faz 2)
#   - EXPO_PUBLIC_PDF_BASE_URL (Faz 3)

# 4. Migration uygula
cd packages/db
pnpm supabase db push
# 0004_teaching_engine.sql çalışacak

# 5. Worker'ları başlat
cd ../..
pnpm dev:workers   # llm + voice + pdf paralel

# 6. Mobile
pnpm dev:mobile
```

## Test Akışı

### 1. Engine'i çalışırken gör
1. Yeni sohbet aç
2. "Türev nedir?" yaz
3. Yanıttan önce **EngineBadge** görünür: "🌱 İlk karşılaşma · Feynman + 2 gizli taktik"
4. Badge'e tıkla → tam decision detayı (intent: learn_new, behaviors: C6-question-seeding + C10-pre-testing)
5. AI yanıtı bu tekniğe göre gelir — direkt tanım vermez, önce soru sorar

### 2. Bandit öğreniyor mu?
1. Aynı konuda 3-4 ders aç, hep ⭐⭐⭐⭐⭐ ver
2. Yeni ders aç → büyük olasılıkla aynı teknik tekrar gelir (bandit pozitif öğrendi)
3. Bir teknik 1-2 ⭐ ile ratele → o teknik bir süre az gelmeye başlar

DB sorgusuyla kontrol:
```sql
select t.code, t.name, ta.alpha, ta.beta, ta.total_uses, ta.avg_rating
from technique_arms ta
join techniques t on t.id = ta.technique_id
where ta.user_id = '<user-id>'
order by ta.alpha / (ta.alpha + ta.beta) desc;
```

### 3. RAG çalışıyor mu?
1. Subject oluştur (örn: "Lise Biyoloji")
2. PDF yükle (Faz 3 akışı), subject'e bağla → status `ready`
3. O subject'le bağlantılı yeni sohbet aç (subject parametresi geçerken)
4. Yükledigin PDF'in içinden bir konuda soru sor
5. **EngineBadge'de "📄 3 referans"** görünmeli
6. AI yanıtında "X dökümanın 5. sayfasında..." atıfları olmalı

### 4. Concept Map
1. Subject detay ekranı → "+ Ekle" ile 5-10 concept ekle (bazılarına prerequisites yaz)
2. Sağ üstteki 🗺️ butonuna bas
3. Force-directed graph yüklenir — prerequisite edge'leri kesik çizgi
4. Node'a tap → alttan detail card

## Bilinen Sınırlamalar

- **Tarama PDF OCR henüz yok**: `worker-pdf/src/ocr.ts` placeholder. Gerçek OCR için `pdf-img-convert` veya `poppler-utils` + Groq vision Faz 5'te.
- **Engine cold start**: Yeni kullanıcının ilk 5-10 dersinde bandit hâlâ "keşif" modunda — teknikler genelde rastgele görünür. Normal davranış.
- **Intent cache**: Aynı mesaj 30 gün cache'lenir. Bilerek (token tasarrufu) ama farklı context'lerde aynı mesaj → aynı intent dönebilir.
- **2D map performans**: 50+ concept'te layout simulasyonu yavaşlar. Pragmatik üst sınır 30 concept.
- **Behaviors max 3 aktif**: Prompt boğulmasın diye sınırlı. İdeal değil ama deneysel olarak doğru.

## Mimari Karar Kayıtları

### Karar: Engine'in ayrı paket (workspace) olması
Worker-llm route içinde inline yazmak daha hızlı olurdu ama:
- Worker-pdf de gelecekte engine'i (concept matching için) çağıracak
- Vitest ile bağımsız test edilebilir
- Mobile bile bazı parçaları ileride kullanabilir (örn. local context detection)
- Single Responsibility açık — worker sadece HTTP, engine sadece pedagoji

### Karar: Behaviors ve Techniques ayrı katman
Pedagojik literatürde 150 teknik var ama her biri "öğrenciye görünür ana yöntem" değil. Peak-End her dersin sonuna uygulanmalı, ama "teknik seç: Peak-End" demek garip. Bu yüzden:
- Techniques (öğrenciye görünür) → Bandit seçer
- Behaviors (arka plan taktik) → Kural tabanlı + max 3

### Karar: RAG threshold 0.72
Empirik. 0.7 çok gevşek (alakasız chunk'lar), 0.8 çok sıkı (çoğu zaman boş). 0.72 sweet spot.

### Karar: Bandit cold start Beta(1,1)
Beta(1,1) = uniform dağılım. Yeni arm'lar tüm rating ihtimallerine eşit olasılık verir → maksimum keşif. İlk birkaç ders sonra alpha/beta ayrılınca tercih ortaya çıkar.

### Karar: Decision logging her zaman
`engine_decisions` her karar için yazılır. Yer kaplar ama:
- Debug için çok değerli ("AI bu teknik niye seçti?")
- A/B testing için
- Model improvement için

## Maliyet

| Sistem | Çağrı/ders | Maliyet |
|---|---|---|
| Intent classification | 1 (cache miss) | <$0.0001 |
| RAG embedding | 1 (kullanıcı mesajı) | $0.00002 |
| LLM streaming | 1 | Kullanıcının Groq |
| Decision write | 1 DB insert | İhmal |

Toplam: **kullanıcı için ücretsiz**, sen için **<$0.001/ders**. Aylık 1000 ders = ~$1.

## Faz 4 Başarı Kriterleri

- [x] Thompson Sampling matematiksel olarak doğru implementasyon (Marsaglia-Tsang)
- [x] Engine 10 katmanlı karar akışı çalışıyor
- [x] 15 behavior, kural tabanlı orchestrator
- [x] RAG: PDF chunk → embed → similarity → prompt enjeksiyonu
- [x] Engine_decisions audit log'u
- [x] Mobile: Engine Badge görünür şeffaflık
- [x] Mobile: Rating modal → bandit feedback loop
- [x] Subject + Concept CRUD
- [x] 2D Concept Map (force-directed)
- [x] Auto-embed concept on create
- [x] Faz 1-3 eksiklikleri (Faz 1'de düşmüş 7 dosya) doldurulmuş

## Faz 5 (Sonraki) — Flashcard + Quiz + Error Portfolio

- SM-2 algoritmasıyla flashcard tekrar
- Quiz üretici (multiple-choice + open-ended)
- Error portfolio (yanlış cevaplar) + 5 Whys analizi
- Flashcard swipe ekranı production'a hazır
- Tarama PDF için OCR (pdf-img-convert + Groq vision)
- Subject istatistikleri dashboard
