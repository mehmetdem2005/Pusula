# ADR-001: Türkiye Emlak & Oto AI Analiz Platformu — Temel Mimari Kararlar

**Status:** Proposed
**Date:** 21 Mayıs 2026
**Deciders:** Mehmet (ürün sahibi / app developer)
**Codename:** Pusula (eski codename: Kelepir — "Kelepir Skoru" kavramı skor adı olarak korunmuştur)

---

## Context

Türkiye pazarına yönelik, emlakçılar ve galericilerin kullanacağı bir AI analiz/otomasyon platformu inşa edilecek. Ürün, ilanları (konut, arsa, tarla, ofis, oto) "kelepirlik" perspektifinden değerlendiriyor, deterministik bir skor üretiyor, AI ile açıklayıcı/diyalog katmanı sunuyor ve emlakçıya pazarlama metni üretiyor.

**Zorlayıcı kısıtlar / forces:**

1. **sahibinden.com zorunlu** — kullanıcı bu kaynak olmadan ürünü düşünmüyor; ancak sahibinden ToS otomatik scraping'i yasaklıyor ve agresif bot koruması var (Cloudflare, ratelimit, IP ban).
2. **AAA seviye** — ürün prodüksiyon kalitesi, profesyonel; "weekend project" değil.
3. **Mükemmel otomasyon** — kullanıcı 100+ ilanı tek tıkla analiz edebilmeli, manuel kopya-yapıştır olmamalı.
4. **Çoklu AI provider talebi** — Groq + Gemini + DeepSeek + Anthropic; her birinin free/ucuz tier'ından yararlanma + BYOK güvenliği.
5. **Türkçe içerik** — ilan metinleri, mahalle adları, yerel kavramlar; modelin Türkçe nüansta zayıf olmaması.
6. **Tek geliştirici (Mehmet) + AI yardımı** — geliştirme kapasitesi sınırlı, tech stack monorepo + tek dil + opinionated framework olmalı.
7. **MVP 3-4 ay** — sonraki dikeyler için mimari engellenmemeli.

---

## Decision

Aşağıdaki temel mimari kararlar alınmıştır:

| #   | Karar                        | Özet                                                                                                                                                                                                                                                                                                              |
| --- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Dağıtım modeli               | **Web app (ana ürün) + opsiyonel hafif Chrome extension (MV3)** — hibrit "user-assisted ingestion"                                                                                                                                                                                                                |
| D2  | Veri toplama                 | sahibinden için **client-side, kullanıcı oturumlu DOM okuma**. Diğer kaynaklar (izinli) backend'ten fetch. Açık veri (TÜİK/AFAD/TKGM) backend cache.                                                                                                                                                              |
| D3  | Backend                      | **Node.js + NestJS + PostgreSQL 16 + pgvector + Redis** (TypeScript monorepo)                                                                                                                                                                                                                                     |
| D4  | Frontend                     | **Next.js 15 (App Router) + TypeScript + Tailwind CSS + shadcn/ui + TanStack Query**                                                                                                                                                                                                                              |
| D5  | Extension                    | **Manifest V3, side panel + content script + service worker**, kod paylaşımı için monorepo paketi                                                                                                                                                                                                                 |
| D6  | Skorlama                     | **Deterministik formül** (LLM kullanılmaz). LLM yalnızca skorun bileşenlerini doğal dilde **açıklamak/savunmak** için.                                                                                                                                                                                            |
| D7  | LLM mimarisi                 | **Multi-Provider LLM Gateway** — Groq, Gemini, DeepSeek, Anthropic için adapter pattern; OpenAI uyumlu unified interface                                                                                                                                                                                          |
| D8  | Key güvenliği & ticari model | **BETA (V1): BYOK-only** (key'ler client-side IndexedDB'de AES-GCM şifreli, master password). **GA (V2): BYOK + Managed Subscription** (Stripe-tabanlı haftalık/aylık/yıllık planlar, server-side key pool, kullanıcı key girmek zorunda değil). DB şeması V1'de subscription tablolarını içerir (boş ama hazır). |
| D9  | Hosting                      | **Vercel (web)** + **Fly.io / Railway (api)** + **Supabase (Postgres + Auth + Storage)** — MVP için. V2'de gerekirse Hetzner self-host.                                                                                                                                                                           |
| D10 | Auth                         | **Supabase Auth** (email + magic link + Google OAuth). Extension token bridge ile aynı session.                                                                                                                                                                                                                   |
| D11 | Monorepo                     | **pnpm workspaces + Turborepo** — apps/web, apps/extension, apps/api, packages/\*                                                                                                                                                                                                                                 |
| D12 | Observability                | **Sentry (errors) + PostHog (product analytics) + OpenTelemetry (traces, V1)**                                                                                                                                                                                                                                    |
| D13 | Agent orkestrasyonu          | **Tier 0-3 multi-agent hiyerarşisi.** Pusula Brain (orchestrator) + 9 specialist + 4 background + tool workers. Function-calling tabanlı sync, BullMQ tabanlı async.                                                                                                                                              |
| D14 | Skorlama stack               | **3-katmanlı AAA skorlama** — Deterministik core + ML enrichment (hedonic + anomaly) + LLM açıklama. 8 pillar, 80+ parametre. LLM hiçbir sayısal skoru değiştiremez.                                                                                                                                              |
| D15 | Adaptif veri skoru           | **Eksik veriye dinamik ağırlık yeniden dağıtımı.** Her parametre fallback chain + confidence loss değerine sahip. Min viable score sınırı (coverage < %30 → skor verme). Async enrichment ile aşamalı sonuç.                                                                                                      |
| D16 | Konuşma modu                 | **Intent-discovery tabanlı persona-aware sohbet.** XState state machine. İlk turn'de persona kilitlenir; tüm yanıtlar buyer/seller/investor/researcher'a göre özelleşir.                                                                                                                                          |
| D17 | Multi-vertical core          | **`@pusula/scoring-core` + dikey-spesifik paketler** (konut/arsa/oto/ticari). Abstract `AdaptiveScoringEngine` her dikey için ortak interface.                                                                                                                                                                    |

---

## Options Considered

### D1: Dağıtım modeli

#### Option A: Saf Chrome Extension

| Dimension     | Assessment                             |
| ------------- | -------------------------------------- |
| Complexity    | Low                                    |
| Cost          | Low (Chrome Web Store + cloud minimum) |
| Scalability   | Low (toplu sıralama zor)               |
| ToS riski     | En düşük                               |
| UX zenginliği | Sınırlı (popup/side panel)             |

**Pros:** En savunulabilir hukuki konum, hızlı time-to-market.
**Cons:** Toplu analiz, raporlama, dashboard UX'i sınırlı. "AAA" hissi vermiyor.

#### Option B: Saf Web Dashboard (sahibinden backend'ten fetch)

| Dimension     | Assessment                       |
| ------------- | -------------------------------- |
| Complexity    | Med                              |
| Cost          | Med (proxy/IP rotation maliyeti) |
| Scalability   | High                             |
| ToS riski     | **Çok yüksek — yasaklı**         |
| UX zenginliği | Yüksek                           |

**Pros:** En zengin dashboard, toplu sorgu kolay.
**Cons:** sahibinden ToS açık ihlali; IP ban + olası dava riski; sürdürülemez.

#### Option C (SEÇİLDİ): Hibrit — Web App + opsiyonel Extension/Bookmarklet

| Dimension     | Assessment                                              |
| ------------- | ------------------------------------------------------- |
| Complexity    | Med-High                                                |
| Cost          | Med                                                     |
| Scalability   | High                                                    |
| ToS riski     | Düşük (sahibinden için client-side, kullanıcı oturumlu) |
| UX zenginliği | Yüksek                                                  |

**Pros:** En iyi ikisinin birleşimi. Web app AAA UX, extension ToS-safe ingestion. Diğer kaynaklar backend'ten paralel fetch.
**Cons:** İki ayrı runtime (web + extension), kod paylaşımı için monorepo şart. Auth bridge gerekli.

### D3: Backend Stack

#### Option A: NestJS + PostgreSQL + Redis (SEÇİLDİ)

**Pros:** TypeScript ekosistem paylaşımı (extension/web ile aynı dil), opinionated framework, DI/modüler yapı, ekspertizi olan geliştirici sayısı.
**Cons:** Java-vari boilerplate hissi, ağır.

#### Option B: Go (Fiber/Echo) + PostgreSQL + Redis

**Pros:** Performans, küçük binary, deploy basit.
**Cons:** TypeScript paylaşımı yok, AI library ekosistemi daha zayıf (Python/TS hala lider), tek geliştirici için iki ayrı dil yükü.

#### Option C: Python (FastAPI) + PostgreSQL + Redis

**Pros:** AI library ekosistemi (LangChain, LlamaIndex, transformers), data science kolaylığı.
**Cons:** Tek geliştirici için ekstra dil; async ekosistem hâlâ Node kadar olgun değil; deployment ağır.

**Karar gerekçesi:** TypeScript tek-dil prensibi, MVP süresi (3-4 ay), Mehmet'in app dev profili → NestJS. Python ML işleri için ileride mikroservis ayrılabilir.

### D7: LLM Mimarisi

#### Option A: Tek provider (sadece Claude/OpenAI)

**Pros:** Basit, tek SDK, tek faturalandırma.
**Cons:** Kullanıcı isteğine aykırı; ucuz tier (Groq, Gemini free, DeepSeek) avantajını kaybeder; vendor lock-in.

#### Option B (SEÇİLDİ): Multi-Provider Gateway

**Pros:** Görev başına optimal model (hız/maliyet/kalite trade-off), failover, free tier'lardan faydalanma, kullanıcı override.
**Cons:** Adapter karmaşıklığı, normalize edilmiş feature set'in en az kapsayan provider'a göre sınırlanması (lowest-common-denominator riski), test yükü.

**Karar gerekçesi:** Kullanıcı talebi + ekonomik avantaj + esneklik.

### D8: Key Güvenliği

#### Option A: Server-side key vault (her zaman backend proxy)

**Pros:** Tek noktadan rate limit, audit log, kullanıcı kolaylığı.
**Cons:** Backend, kullanıcının API key'lerinin sorumlusu olur (compliance + sorumluluk yükü); free tier "BYOK ile sıfır maliyet" vaadi kaybolur.

#### Option B (SEÇİLDİ): Client-side encrypted vault, opsiyonel server proxy

**Pros:** MVP'de sıfır maliyet, key kullanıcıda kalır, backend "zero-knowledge" konumlanabilir.
**Cons:** Key'ler tarayıcıya bağımlı (cihaz değişiminde re-import), master password kaybı = key kaybı.

**Detay:** Key'ler IndexedDB'ye AES-GCM ile şifreli yazılır. Master password'dan PBKDF2 (600k iterations) ile key türetilir. LLM çağrıları **client'tan direkt** provider'a (CORS izin verenler için) ya da **stateless backend proxy** üzerinden (Anthropic gibi CORS izin vermeyenler için — proxy key'i talep anında çözer, log'lamaz, hafızada tutmaz).

---

## Trade-off Analysis

### Hibrit vs Saf Extension

Saf extension daha hızlı ve daha az risk; ama emlakçı persona dashboard, rapor, toplu analiz ve müşteri yönetimi istiyor. "Tek tık ile 100 ilan analizi" extension-only modelde zor. Hibrit, extension'ı bir **ingestion sondası** olarak konumlandırıp ağır iş yükünü backend'e taşıyor. Bu, 6 ay sonra V1'de B2B CRM modülünü eklerken refactor'u önlüyor.

### Multi-Provider Gateway vs Tek Provider

Multi-provider tasarım %20-30 ek karmaşıklık getiriyor (adapter, normalize, failover testleri). Karşılığında:

- Groq Llama 3.3 70B (~$0.59/$0.79 per M token) hızlı skor açıklamasında Claude Sonnet'e ($3/$15) göre **5x daha ucuz**.
- Gemini 2.5 Flash-Lite free tier, fotoğraf analizinde 1500 RPD ücretsiz alan açıyor.
- DeepSeek R1 reasoning, "neden bu fiyat kelepir" mantık zinciri için en ucuz ($0.55/$2.19) + off-peak %75 indirim.
- Anthropic Claude Sonnet 4.6 / Opus 4.7, Türkçe pazarlama metni üretiminde en kaliteli çıktıyı veriyor (premium tier).

Yıllık maliyet farkı (orta yoğunluklu kullanıcı için): **₺2,000-12,000** tasarruf potansiyeli.

### Client-side Key vs Server-side Key

Client-side key kullanıcı için bir ekstra adım (master password) demek, ama:

- Veri ihlali durumunda key'lerimiz çalınmaz (zaten elimizde yok).
- KVKK/GDPR kapsamında "kişisel veri" olarak işlenmemiş olur.
- Free tier ekonomisini koruyoruz.

Server-side proxy V1 Pro tier'da opsiyonel olarak açılacak (kullanıcı isterse "key'i bize ver, sen kullanma" diyebilir; abonelik karşılığı).

---

## Consequences

### Kolaylaşan / kazanılan

- ✅ TypeScript tek-dil monorepo: code reuse (scoring, types, validation Zod şemaları, LLM gateway).
- ✅ Extension + web aynı auth session paylaşıyor (token bridge).
- ✅ Deterministik skor → açıklanabilir + test edilebilir + LLM'den bağımsız.
- ✅ Provider değişimi UI'dan tek tıkla mümkün; vendor lock-in yok.
- ✅ MVP maliyet ~$0/ay (Vercel free, Supabase free, kullanıcı kendi key'ini getiriyor).

### Zorlaşan / yeni risk

- ⚠️ MV3 service worker kısıtları (event-driven, persistent state yok) — state, IndexedDB veya backend'e taşınmalı.
- ⚠️ sahibinden DOM yapısı değişirse parser kırılır — versiyonlu selector + telemetry + auto-fallback şart.
- ⚠️ Multi-provider feature parity testi — JSON mode, tool use, vision desteği provider başına farklı; abstraction katmanı dikkatli tasarlanmalı.
- ⚠️ Master password UX — kullanıcı unutursa key import gerekir; recovery flow tasarlanmalı (örn. master password'ün hash'ini değil, kendisinin türetilmiş bir versiyonu ile recovery code).
- ⚠️ Chrome Web Store inceleme süresi (1-2 hafta) — early access için manuel kurulum modu (developer mode) hazır olmalı.

### İleride yeniden ele alınacak

- Anthropic CORS politikası açılırsa proxy backend'in tamamı kaldırılabilir (browser-direct çağrı).
- Lokal LLM (Llama 3.x Türkçe fine-tune) Türkçede yeterli olursa, V3 enterprise tier'da private cluster.
- Vector store: pgvector MVP için yeter, ama V2'de embedding ölçeği büyürse Pinecone/Qdrant ayrı servis.
- WASM-based scoring: V2'de scoring engine'i Rust → WASM ile derleyip hem web hem extension hem backend'de aynı binary'yi koşmak (single source of truth).

---

## Action Items

1. [x] **D1-D12 onaylanmış mı?** Mehmet review.
2. [ ] **Repo iskeleti** kurulacak: pnpm workspaces + Turborepo (`apps/web`, `apps/extension`, `apps/api`, `packages/scoring`, `packages/llm-gateway`, `packages/shared`, `packages/db`).
3. [ ] **Supabase projesi** oluştur, Auth + Postgres + Storage + pgvector enable.
4. [ ] **Sentry + PostHog** projeleri oluştur, DSN'leri env'e ekle.
5. [ ] **Domain + SSL**: app.kelepir.tr (veya seçilecek isim) DNS + Vercel/Fly bağlantısı.
6. [ ] **Manifest V3** extension iskeleti — content script (sahibinden DOM parse), service worker (auth bridge + API call), side panel UI.
7. [ ] **Scoring engine** v0 paketi — `packages/scoring` (kelepir formülü + parametre tipleri + birim test).
8. [ ] **LLM Gateway** paketi — `packages/llm-gateway` (adapter pattern: GroqAdapter, GeminiAdapter, DeepSeekAdapter, AnthropicAdapter, OpenAICompatBase).
9. [ ] **CI/CD** — GitHub Actions: lint + typecheck + test + build, Vercel preview deploy.
10. [ ] **Skorlama Modeli v1** doküman onayı (ayrı dosya: `03-skorlama-modeli.md`).
11. [ ] **Provider × Model Matrisi** doküman onayı (ayrı dosya: `04-provider-model-matrisi.md`).
12. [ ] **Hukuki review** — sahibinden user-assisted ingestion modelinin KVKK + ToS açısından gözden geçirilmesi (mümkünse avukat görüşü).

---

## Ek: Multi-Provider LLM Gateway (Detay)

### Hedefler

- Tek bir `chat()` arayüzü, dört provider, runtime'da değişebilir.
- Görev tipine göre **default model routing**, kullanıcı override edilebilir.
- Streaming + non-streaming.
- JSON mode / structured output normalize (Zod şema doğrulamalı).
- Tool use / function calling normalize (her provider'ın native formatına çeviri).
- Vision input — modelin desteği yoksa fallback model'e router.
- Rate limit + quota tracking per provider per user.
- Otomatik failover (örn. Groq 429 → Gemini).
- Cost estimation: her çağrıda token + USD tahmini kaydet.

### Tip Tanımı (TypeScript)

```typescript
// packages/llm-gateway/src/types.ts
export type Provider = 'groq' | 'gemini' | 'deepseek' | 'anthropic';

export type TaskType =
  | 'quick-chat'
  | 'score-explanation'
  | 'marketing-copy'
  | 'reasoning'
  | 'vision'
  | 'long-report';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | ContentPart[];
}

export interface ContentPart {
  type: 'text' | 'image';
  text?: string;
  imageUrl?: string;
  imageBase64?: string;
}

export interface ChatOptions {
  provider?: Provider; // override
  model?: string; // override
  taskType: TaskType; // routing key
  temperature?: number;
  maxTokens?: number;
  jsonSchema?: object; // structured output
  tools?: ToolDefinition[]; // function calling
  stream?: boolean;
  signal?: AbortSignal;
}

export interface ChatResponse {
  text: string;
  usage: { input: number; output: number; total: number };
  cost: { usd: number };
  provider: Provider;
  model: string;
  finishReason: string;
  toolCalls?: ToolCall[];
}

export interface LLMAdapter {
  chat(messages: ChatMessage[], options: ChatOptions): Promise<ChatResponse>;
  chatStream(messages: ChatMessage[], options: ChatOptions): AsyncIterable<ChatChunk>;
  supportsVision(model: string): boolean;
  supportsJsonMode(model: string): boolean;
  supportsTools(model: string): boolean;
}
```

### Routing Tablosu (varsayılan)

| Task Type           | 1. Tercih                      | 2. Tercih (failover)       | 3. Tercih        |
| ------------------- | ------------------------------ | -------------------------- | ---------------- |
| `quick-chat`        | Groq `llama-3.3-70b-versatile` | Gemini `2.5-flash`         | DeepSeek `chat`  |
| `score-explanation` | DeepSeek `chat` (V3)           | Groq `llama-3.3-70b`       | Claude Haiku 4.5 |
| `marketing-copy`    | Claude Sonnet 4.6              | Gemini `2.5-pro`           | DeepSeek `chat`  |
| `reasoning`         | DeepSeek `reasoner` (R1)       | Claude Opus 4.7            | Gemini `2.5-pro` |
| `vision`            | Gemini `2.5-flash`             | Claude Haiku 4.5 (vision)  | —                |
| `long-report`       | Gemini `2.5-pro` (1M ctx)      | Claude Sonnet 4.6 (1M ctx) | DeepSeek (131K)  |

Kullanıcı Settings'te her task type için tercih ettiği model'i override edebilir.

---

---

## Ek: Beta → GA Ticarileşme Stratejisi

### Faz Planı

| Faz                 | Süre       | Model                                  | Kullanıcı maliyeti                     | Bizim maliyetimiz                      |
| ------------------- | ---------- | -------------------------------------- | -------------------------------------- | -------------------------------------- |
| **Beta (V1)**       | İlk 6-9 ay | BYOK only                              | Kendi API faturası                     | ~$0 (Vercel/Supabase free)             |
| **Public GA (V2)**  | 6-9. ay →  | BYOK + Managed Subscription            | İki seçenek: kendi key'i veya abonelik | Abonelik gelirinden LLM maliyeti çıkar |
| **Enterprise (V3)** | 12. ay →   | Yıllık kontrat + on-prem + white label | Ayrı pazarlık                          | İmplementasyon + destek                |

### Beta UI Beklenti Yönetimi

Settings sayfasında üst banner:

> 🚧 **Beta sürümü.** Şu an kendi LLM API key'inizi kullanıyorsunuz. Yakında abonelik sistemi geleceğinde key girmek zorunda olmadan tüm modellere erişebileceksiniz. Beta kullanıcıları için **%50 ilk yıl indirimi** ve **"Erken Destekçi" rozeti** sağlanacaktır.

### V2 Subscription Tier Önerisi (Mehmet kararına yardımcı referans)

| Plan            | Aylık ücret | Yıllık (₺)    | İlan analizi/ay        | Modeller                                             | Foto AI  | B2B CRM            | Kullanıcı sayısı |
| --------------- | ----------- | ------------- | ---------------------- | ---------------------------------------------------- | -------- | ------------------ | ---------------- |
| **Free (BYOK)** | ₺0          | ₺0            | Sınırsız (kendi key'i) | Tümü (BYOK)                                          | Var      | Yok                | 1                |
| **Starter**     | ₺149        | ₺1.430 (-20%) | 500                    | Ucuz modeller (Haiku 4.5, Gemini Flash, DeepSeek V3) | 50/ay    | Yok                | 1                |
| **Pro**         | ₺499        | ₺4.790 (-20%) | Sınırsız               | Tümü (Sonnet 4.6, Opus 4.7, GPT-4o, Gemini Pro)      | Sınırsız | Var                | 3                |
| **Pro Yıllık**  | —           | ₺4.490 (-25%) | Sınırsız               | Tümü                                                 | Sınırsız | Var                | 3                |
| **Enterprise**  | Özel        | Özel          | Sınırsız               | Tümü + on-prem + custom model                        | Sınırsız | Var + beyaz etiket | Sınırsız         |

**Haftalık** varyantlar pop-up sale için (₺59/hafta gibi) — tatil mevsiminde / Dubai dönüşü vs. one-off kullanım.

### V2'de Migration Path

- Beta'da kayıt olan tüm kullanıcılara V2 lansmanında otomatik **3 ay Pro plan ücretsiz**
- "Erken Destekçi" rozeti profilde + emlakçı sayfasında görünür
- Beta'daki BYOK key'leri kullanıcı seçimine kalmış: silebilir veya korumayı sürdürebilir (hybrid kullanım)

### V2'de Türkiye Vergi & Fatura

- Stripe Tax veya Iyzico (Türkiye'ye özgü) tercih edilecek
- KDV %20 otomatik hesaplama
- E-Fatura entegrasyonu: **Logo Yazılım**, **Paraşüt**, veya **Mikro Yazılım** API
- Vergi kimlik no toplama formu (kurumsal müşteriler için)

### Architecture Hazırlığı: V1'de Yapılacak Schema-Ready İşler

DB şeması V1'de aşağıdaki tabloları içeriyor (boş, ama hazır):

```sql
-- V1'DE AKTİF
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  display_name TEXT,
  role TEXT DEFAULT 'individual' CHECK (role IN ('individual', 'agent', 'dealer', 'admin'))
);

CREATE TABLE user_provider_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('groq', 'gemini', 'deepseek', 'anthropic', 'openai', 'openrouter')),
  encrypted_key TEXT NOT NULL,  -- client-side encrypted blob (server zero-knowledge)
  key_label TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_used_at TIMESTAMPTZ
);

CREATE TABLE usage_events (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT,
  model TEXT,
  task_type TEXT,
  input_tokens INT,
  output_tokens INT,
  cost_usd NUMERIC(10, 6),
  key_source TEXT DEFAULT 'user_byok' CHECK (key_source IN ('user_byok', 'platform_pool')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_usage_events_user_time ON usage_events (user_id, created_at DESC);

-- V2'DE AKTİF OLACAK (V1'de boş şema hazır)
CREATE TABLE subscription_plans (
  id TEXT PRIMARY KEY,             -- 'starter_monthly', 'pro_yearly', vs.
  name TEXT NOT NULL,
  billing_period TEXT CHECK (billing_period IN ('weekly', 'monthly', 'yearly')),
  price_try NUMERIC(10, 2),
  monthly_ilan_quota INT,           -- NULL = sınırsız
  monthly_photo_ai_quota INT,
  allowed_providers TEXT[],
  allowed_models TEXT[],
  features JSONB,                   -- B2B CRM, white_label, vs.
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  plan_id TEXT REFERENCES subscription_plans(id),
  status TEXT CHECK (status IN ('trialing', 'active', 'past_due', 'canceled', 'unpaid')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE platform_provider_keys (
  -- V2: managed (proxy) modu için platform'un kendi key havuzu
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  vault_secret_id TEXT NOT NULL,    -- Supabase Vault veya AWS Secrets Manager referansı
  monthly_token_cap BIGINT,
  is_active BOOLEAN DEFAULT true,
  notes TEXT
);

CREATE TABLE quota_usage (
  -- V2: kullanıcının plan kotası altında ne kadar tükettiği (hızlı sorgu için cache)
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  period_start DATE,
  ilan_count INT DEFAULT 0,
  photo_ai_count INT DEFAULT 0,
  token_count BIGINT DEFAULT 0,
  PRIMARY KEY (user_id, period_start)
);
```

### LLM Gateway Abstraction — Beta vs GA

Gateway adapter imzası, key kaynağından bağımsız tasarlanır:

```typescript
interface LLMAdapter {
  chat(
    messages: ChatMessage[],
    options: ChatOptions,
    keyResolver: KeyResolver, // beta'da user IndexedDB, GA'de platform vault
  ): Promise<ChatResponse>;
}

interface KeyResolver {
  source: 'user_byok' | 'platform_pool';
  getKey(provider: Provider): Promise<string>;
}
```

V2'de yeni bir `PlatformKeyResolver` eklenir; adapter kodu değişmez. Bu, ADR'ın amaç fonksiyonu — V2 büyütmesinde adapter rewrite gerekmiyor.

---

---

## D13 — Multi-Agent Orchestration (Tier 0-3 Hiyerarşi)

**Statü:** Proposed
**Tarih:** 22 Mayıs 2026

### Context

Pusula tek bir monolitik LLM call'la "ilanı analiz et + skorla + öneri ver + pazarlama yaz" yapabilirdi. Ancak bu yaklaşım üç problemi beraberinde getirir: (1) Her görev için optimal model farklı (vision için Gemini, yazım için Claude, reasoning için DeepSeek R1), tek model her şeyi yapamaz. (2) Hata izolasyonu yok — bir alt-görev hata verirse tüm cevap çöker. (3) Maliyet kontrolsüz — gereksiz LLM çağrıları.

### Options

**A. Monolitik tek LLM çağrısı.** Tek prompt'ta hem analiz hem yorumla.

| Boyut           | Değerlendirme                      |
| --------------- | ---------------------------------- |
| Karmaşıklık     | Düşük                              |
| Maliyet         | Yüksek (uzun prompt + Claude Opus) |
| Esneklik        | Düşük                              |
| Hata izolasyonu | Yok                                |

**B. ReAct pattern tek agent, çoklu tool.** Tek LLM, function calling ile araç çağırır.

| Boyut           | Değerlendirme |
| --------------- | ------------- |
| Karmaşıklık     | Orta          |
| Maliyet         | Orta          |
| Esneklik        | Orta          |
| Hata izolasyonu | Kısmen        |

**C (SEÇİLDİ). 4-katmanlı agent hiyerarşisi.** Tier 0 orchestrator (Brain) + Tier 1 specialist'ler + Tier 2 background + Tier 3 tool workers.

| Boyut              | Değerlendirme                   |
| ------------------ | ------------------------------- |
| Karmaşıklık        | Yüksek (ama yönetilebilir)      |
| Maliyet            | Düşük (her görev optimal model) |
| Esneklik           | Yüksek                          |
| Hata izolasyonu    | Tam                             |
| Test edilebilirlik | Yüksek                          |

### Decision

C. Detaylı kart-format spec'i `11-multi-agent-mimarisi.md`'de. Tüm agent'lar Zod-validated interface'lerle iletişim kurar; OpenTelemetry tracing her zincirde mandatory.

### Consequences

**Kazanılan:**

- Görev başına optimal LLM seçimi → %40-60 maliyet tasarrufu (test scenario'da)
- Hata izolasyonu (Vision agent crash olursa skor yine üretilir)
- Bağımsız test edilebilirlik (her agent kendi unit test paketi)
- Capability maturity model — yetenekler MVP/V1/V2 olarak büyütülebilir

**Zorlaşan / risk:**

- Operasyonel karmaşıklık (8 farklı SLO, distributed tracing zorunlu)
- "Function call recursion" gibi yeni hata sınıfları (max depth/budget guard'lar şart)
- Test stratejisi mecburen contract-based (kontrat kırılırsa CI fail)

---

## D14 — AAA Scoring Stack (3-Katmanlı: Deterministik + ML + LLM)

**Statü:** Proposed
**Tarih:** 22 Mayıs 2026

### Context

D6'da skorlama "deterministik formül" olarak tanımlandı. Ancak prodüksiyon kalite için bu yeterli değil: hedonic regression daha iyi karşılaştırma verir, anomaly detection şüpheli ilanları yakalar, Vision/NLP yeni boyutlar açar. Tek katmanlı (sadece deterministik) yaklaşım uzun vadede rakiplere karşı zayıflar.

### Options

**A. Sadece deterministik (D6 mevcut).** Basit formül.

**B. LLM-driven scoring.** LLM'e direkt "skor 0-100 ver" sorulur.

**C (SEÇİLDİ). 3-katmanlı: Deterministik core + ML enrichment + LLM açıklama.**

| Boyut                  | A      | B                   | C                           |
| ---------------------- | ------ | ------------------- | --------------------------- |
| Doğruluk               | Orta   | Yüksek ama tutarsız | Yüksek + tutarlı            |
| Açıklanabilirlik       | Yüksek | Düşük               | Yüksek                      |
| Tekrar üretilebilirlik | Tam    | Yok                 | Tam (LLM sadece açıklama)   |
| Geliştirme maliyeti    | Düşük  | Orta                | Yüksek                      |
| Operasyonel maliyet    | Düşük  | Yüksek              | Düşük (deterministik hızlı) |

### Decision

C. 8 pillar (`fiyat_avantaji`, `kalite`, `konum`, `risk`, `vision`, `nlp`, `pazar_dinamigi`, `finansal_model`) ile genişletilmiş model. Hedonic regression Phase 2'de devreye girer (1000+ ilanlı dataset hazır olduğunda). Anomaly detection (Isolation Forest) MVP'den itibaren. LLM sayısal skora ASLA dokunamaz — sadece açıklayıcı katman.

Detaylı spec: `10-aaa-skorlama-spec.md`

### Consequences

**Kazanılan:**

- 80+ parametre ile rakiplerden farklılaşma
- Vision + NLP ile foto/metin yanıltıcılığını yakalama
- Hedonic ML zamanla iyileşen kalibrasyon

**Zorlaşan / risk:**

- ML modelleri için training data pipeline'ı şart (`packages/hedonic/`)
- Vision LLM maliyeti yönetilmeli (ilan başına $0.02 guardrail)
- Model versiyonlama + canary deployment + drift detection zorunlu hale geldi
- Test stratejisi ML regression suite eklemek zorunda (bkz `16-test-stratejisi.md` §6)

---

## D15 — Adaptive Data-Aware Scoring with Dynamic Weight Redistribution

**Statü:** Proposed
**Tarih:** 22 Mayıs 2026

### Context

Türkiye emlak/oto pazarında her ilan için tüm 80+ parametre asla mevcut olmayacak. sahibinden ilanlarında çoğu zaman tapu durumu boş, fotoğraflar yetersiz, mahalle bilgisi belirsizdir. "Veri eksik → 0 puan" yaklaşımı kullanıcıya yanlış sinyal verir (ucuz bir ilan veri yok diye düşük skor alır).

### Options

**A. Sabit ağırlık, eksik veri = 0.** Pillar verisi yoksa 0 değeri ile çarpılır.

| Sonuç | Eksik veri olan ilan haksız yere düşük skor alır |

**B. Sabit ağırlık, eksik veri = pillar atla.** Pillar tamamen yok sayılır ama ağırlıklar yeniden normalize edilmez.

| Sonuç | Skor formülü 1'den küçük toplamla çalışır, anlamsız sayılar üretir |

**C (SEÇİLDİ). Dinamik ağırlık yeniden dağıtımı + confidence calculus.** Her parametre fallback chain'i ile çekilir; mevcut parametrelerin ağırlığı `total_effective` ile normalize edilir; eksiklik bir confidence loss'u olarak raporlanır.

### Decision

C. Algoritma `13-veri-mevcudiyeti-ve-dinamik-skor.md`'de detaylı. Minimum viable score sınırı: toplam coverage < %30 ise skor verme, "veri yetersiz" döndür. UI'da global confidence (%X güvenle veriyoruz) gösterilir + hangi parametrelerin eksik olduğu açıkça yazılır.

### Consequences

**Kazanılan:**

- Eksik veri durumunda skor güvenilirliği korunur
- Kullanıcıya transparan iletişim (neyin eksik olduğu görünür)
- Async enrichment ile zamanla iyileşen skor (pass 1 → pass 2)
- Confidence skoru kalibre edilebilir bir kalite metriği

**Zorlaşan / risk:**

- Fallback chain her parametre için tasarlanmalı (operasyonel iş)
- Confidence loss değerleri kalibre edilmeli (Phase 2 Bayesian opt)
- UI tasarımı confidence'ı doğru sunmalı (kullanıcı kafa karışıklığı riski)
- A/B testler "düşük confidence skor mu göster, hiç gösterme mi" gibi UX sorularını çözmeli

---

## D16 — Conversational Mode with Intent Discovery

**Statü:** Proposed
**Tarih:** 22 Mayıs 2026

### Context

Pusula'nın değer önerisi sayısal skor + AI açıklama. Ancak kullanıcı arayüzü form tabanlı olursa, ürün "veri girişi - rapor çıkışı" hissi verir; sıkıcı ve kullanıcının amacına özelleşemez. Sohbet tabanlı arayüz hem persona-aware deneyim (alıcı vs yatırımcı) hem de doğal kullanıcı yönlendirme imkânı verir.

### Options

**A. Form tabanlı UI.** Kullanıcı URL yapıştırır, skor görür. Chat opsiyonel.

**B. Tek tip chat.** Persona ayrımı yok, herkese aynı ton.

**C (SEÇİLDİ). Intent-discovery chat — persona kilitli akış.** İlk turn'de "alıcı/satıcı/yatırımcı/araştırmacı" sorulur, sonra tüm yanıtlar bu persona'ya özelleşir.

### Decision

C. XState state machine ile yönetilir. İlk turn'de persona belirlenmediyse `CLARIFY` state'ine gidilir. Persona belirlendikten sonra LLM system prompt'ı her turn'de buna göre re-inject edilir. Slash command'lar (`/analiz`, `/kıyas`, ...) gelişmiş kullanıcı için.

Detaylı spec: `12-konusmasal-mod-spec.md`

### Consequences

**Kazanılan:**

- Persona-aware ton ve içerik (yatırımcı sayı görür, alıcı risk uyarısı alır)
- Doğal arayüz → daha yüksek engagement
- Memory ile kullanıcı tercih hatırlama (bütçe, lokasyon)
- Slash command'lar power user'lar için "hızlı şerit"

**Zorlaşan / risk:**

- Intent classifier kalitesi kritik (yanlış sınıflandırma = yanlış agent)
- Persona drift'i izlenmeli (ortada persona değişmemeli)
- Hallucination guard'ları (LLM sayı uydurma riski) reflective check ile
- Conversational state machine test edilmesi geleneksel UI testinden zor

---

## D17 — Multi-Vertical Scoring Core

**Statü:** Proposed
**Tarih:** 22 Mayıs 2026

### Context

Roadmap'te V0.2 arsa, V2 oto, V3 ticari modüller var. Eğer her dikey kendi scoring engine'ini sıfırdan yazarsa: (1) ortak işler (normalize, sigmoid, anomaly) tekrar yazılır, (2) bakım yükü artar, (3) test fixture'ları ayrışır.

### Options

**A. Tek monolitik `@pusula/scoring`.** Konut + arsa + oto aynı dosyada.

**B. Her dikey ayrı paket, ortak kod copy-paste.**

**C (SEÇİLDİ). Abstract core + concrete dikey paketler.** `@pusula/scoring-core` abstract `AdaptiveScoringEngine` sınıfını tanımlar; `@pusula/scoring-konut`, `-arsa`, `-oto` her biri kendi parametre setini ve weight tablosunu inject eder.

### Decision

C. Paket yapısı `10-aaa-skorlama-spec.md` §6.1'de. Konut MVP'de gerçekleşir; arsa V0.2'de; oto V2'de. Aynı abstract sözleşme.

### Consequences

**Kazanılan:**

- DRY (Don't Repeat Yourself) prensibi
- Yeni dikey eklemek kolay (3-4 gün iş)
- Test stratejisi ortak (core testleri her dikey için geçerli)

**Zorlaşan / risk:**

- Abstract class evolution dikkatli yönetilmeli (her dikey'i bozmadan)
- Yeni pillar eklenirse her dikey için aynı anda implementasyon gerek (veya optional pattern)

---

## Bağlantılı Dokümanlar

- `01-mimari-ve-yol-haritasi.md` — ön taslak, önceki konuşma
- `03-skorlama-modeli.md` — deterministik kelepir skoru formülü (üretilecek)
- `04-provider-model-matrisi.md` — detaylı model karşılaştırma tablosu (üretilecek)
- `05-sistem-mimarisi-diyagram.md` — C4-style Mermaid (üretilecek)
- `06-roadmap.md` — MVP/V1/V2/V3 detay (üretilecek)
