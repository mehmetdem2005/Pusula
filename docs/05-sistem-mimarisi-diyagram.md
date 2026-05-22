# Sistem Mimarisi Diyagramı v1

**Date:** 21 Mayıs 2026
**Convention:** C4-style (Context → Container → Component), Mermaid

---

## 1. C4 Level 1 — System Context

```mermaid
flowchart TB
    User["👤 Emlakçı / Galerici / Yatırımcı<br/>(Mehmet'in hedef kullanıcısı)"]

    subgraph KelepirSystem["🏠 Kelepir Platform"]
        direction TB
        WebApp["Web Dashboard<br/>(Next.js 15)"]
        Ext["Chrome Extension<br/>(Manifest V3)"]
        API["Backend API<br/>(NestJS)"]
    end

    SH["sahibinden.com<br/>(kullanıcı sayfaları)"]
    OtherSites["hepsiemlak / emlakjet / zingat<br/>(opt-in scrape, sitemap+RSS)"]
    OpenData["TÜİK / AFAD / MTA / TKGM<br/>(açık veri)"]
    LLMProviders["LLM Providers<br/>Groq / Gemini / DeepSeek / Anthropic"]
    Stripe["💳 Stripe (V2)<br/>Subscription & Billing"]
    Sentry["🐛 Sentry<br/>(Error Tracking)"]
    PostHog["📊 PostHog<br/>(Product Analytics)"]

    User -->|kullanır| WebApp
    User -.->|isteğe bağlı kurar| Ext
    User -->|gezinir| SH

    Ext -->|DOM parse, JSON| API
    WebApp -->|REST + WebSocket| API
    API -->|fetch| OtherSites
    API -->|fetch + cache| OpenData
    API -->|chat / vision / reasoning| LLMProviders
    API -.->|V2: subscription| Stripe

    WebApp -->|telemetry| Sentry
    WebApp -->|events| PostHog
    Ext -->|telemetry| Sentry
    API -->|telemetry| Sentry
```

---

## 2. C4 Level 2 — Container Diagram

```mermaid
flowchart TB
    User["👤 Kullanıcı"]

    subgraph Browser["🌐 Kullanıcı Tarayıcısı"]
        direction TB

        subgraph WebApp["Web App (Next.js)"]
            WebUI["UI Components<br/>(shadcn/ui + Tailwind)"]
            WebState["State / Query<br/>(TanStack Query + Zustand)"]
            WebCrypto["Key Vault<br/>(IndexedDB + AES-GCM)"]
        end

        subgraph Extension["Chrome Extension (MV3)"]
            CS["Content Script<br/>(sahibinden DOM parser)"]
            SW["Service Worker<br/>(auth bridge + API)"]
            SP["Side Panel<br/>(React UI)"]
            EOpts["Options Page"]
        end

        SHTab["sahibinden.com tab<br/>(kullanıcı oturumu)"]
    end

    subgraph Cloud["☁️ Cloud (Vercel + Fly.io + Supabase)"]
        direction TB

        Vercel["Vercel<br/>(Next.js SSR/Edge)"]

        subgraph API["NestJS API (Fly.io)"]
            AuthMod["Auth Module<br/>(JWT verify)"]
            IngestMod["Ingestion Module"]
            ScoreMod["Scoring Module"]
            LLMGW["LLM Gateway"]
            DataMod["External Data Module"]
            BillingMod["Billing Module (V2)"]
            QuotaMod["Quota Enforcement (V2)"]
        end

        subgraph Supabase["Supabase"]
            SBAuth["Auth<br/>(JWT issuer)"]
            SBDB[("PostgreSQL 16<br/>+ pgvector")]
            SBStorage["Storage<br/>(ilan fotoları cache)"]
            SBVault["Vault<br/>(V2: platform keys)"]
        end

        Redis[("Redis<br/>(rate limit + cache)"]
    end

    subgraph External["🌍 External"]
        LLM4["Groq / Gemini / DeepSeek / Anthropic"]
        OpenSrc["TÜİK / AFAD / MTA / Belediye GIS"]
        OtherEmlak["hepsiemlak / emlakjet / zingat"]
        StripeAPI["Stripe (V2)"]
    end

    User --> WebUI
    User --> SHTab

    CS -->|DOM read| SHTab
    CS -->|message| SW
    SP -->|render| User
    SW -->|HTTPS+JWT| Vercel
    SW -->|JWT bridge| WebApp

    WebUI <--> WebState
    WebState --> WebCrypto
    WebState -->|REST+WS| Vercel

    Vercel --> API
    API --> SBAuth
    AuthMod --> SBAuth
    IngestMod --> SBDB
    ScoreMod --> SBDB
    DataMod --> SBDB
    DataMod --> Redis
    LLMGW --> Redis
    BillingMod --> SBDB
    QuotaMod --> Redis

    LLMGW -->|direct or proxy| LLM4
    DataMod --> OpenSrc
    DataMod --> OtherEmlak
    BillingMod --> StripeAPI

    SBStorage <-->|fotoğraflar| API
    SBVault <-->|V2 platform keys| LLMGW
```

---

## 3. C4 Level 3 — LLM Gateway Component

```mermaid
flowchart LR
    Caller["Caller<br/>(scoring / chat / marketing handler)"]

    subgraph Gateway["LLM Gateway"]
        Router["Task Router<br/>(taskType → provider+model)"]
        KeyResolver["Key Resolver<br/>user_byok | platform_pool"]
        Failover["Failover Engine<br/>(429/5xx → next)"]
        Tracker["Usage Tracker<br/>(token+cost+latency)"]

        subgraph Adapters["Provider Adapters"]
            GroqA["GroqAdapter<br/>(OpenAI-compat)"]
            GemA["GeminiAdapter<br/>(Google SDK)"]
            DSA["DeepSeekAdapter<br/>(OpenAI-compat)"]
            AntA["AnthropicAdapter<br/>(Anthropic SDK)"]
        end

        Normalizer["Response Normalizer<br/>(text + usage + tool_calls)"]
        SchemaGuard["JSON Schema Guard<br/>(Zod validation)"]
    end

    Cache[("Redis<br/>Prompt Cache")]
    DB[("Postgres<br/>usage_events")]
    UserVault[("Client-side<br/>IndexedDB")]
    PlatVault[("Supabase Vault<br/>(V2)")]

    Caller --> Router
    Router --> KeyResolver
    KeyResolver --> UserVault
    KeyResolver -.V2.-> PlatVault
    Router --> Adapters
    Adapters --> Failover
    Failover --> Adapters
    Adapters --> Normalizer
    Normalizer --> SchemaGuard
    SchemaGuard --> Tracker
    Tracker --> DB
    Router <--> Cache
```

---

## 4. C4 Level 3 — Scoring Engine Component

```mermaid
flowchart TB
    Input["İlan Input<br/>(Zod-validated)"]

    subgraph Scoring["Scoring Engine"]
        direction TB
        Comp["Comparable Set Builder<br/>(SQL: ilçe + m² ± 20% + 90gün)"]
        FA["FiyatAvantajı<br/>(median Z-score + sigmoid)"]
        KQ["KaliteSkoru<br/>(13 parametre × ağırlık)"]
        KS["KonumSkoru<br/>(10 parametre × ağırlık)"]
        RS["RiskSkoru<br/>(deprem + tapu + iskan)"]
        Comp_["Composer<br/>(0.45·FA + 0.25·KQ + 0.20·KS + 0.10·RS)"]
        Guard["Edge-case Guards<br/>(düşük confidence, deprem cezası)"]
    end

    DB[("Postgres<br/>comparable ilanlar")]
    OpenData["AFAD PGA<br/>MTA fay<br/>TÜİK gelir<br/>OSM POI"]
    Out["Skor Sonucu<br/>(total + breakdown + warnings)"]
    LLMGW["LLM Gateway<br/>(açıklama üret)"]

    Input --> Comp
    Comp --> DB
    Comp --> FA
    Input --> KQ
    Input --> KS
    KS --> OpenData
    Input --> RS
    RS --> OpenData
    FA --> Comp_
    KQ --> Comp_
    KS --> Comp_
    RS --> Comp_
    Comp_ --> Guard
    Guard --> Out
    Out --> LLMGW
```

---

## 5. C4 Level 3 — Chrome Extension Component

```mermaid
flowchart TB
    SHPage["sahibinden.com sayfası"]

    subgraph Ext["Extension (MV3)"]
        Manifest["manifest.json<br/>(MV3, side panel, host permissions)"]

        subgraph CScripts["Content Scripts"]
            Parser["DOM Parser<br/>(versiyonlu selector + fallback)"]
            Collector["Passive Collector<br/>(arama listesi kartları)"]
            Detector["Page Detector<br/>(detay / liste / arama farkı)"]
        end

        subgraph Worker["Service Worker"]
            AuthBridge["Auth Bridge<br/>(cookie ↔ JWT)"]
            APIClient["API Client<br/>(fetch + retry)"]
            MsgRouter["Message Router<br/>(content ↔ panel)"]
        end

        subgraph Panel["Side Panel UI"]
            PanelApp["React App<br/>(skor kartı + AI chat)"]
            QuickActions["Quick Actions<br/>(kaydet, paylaş, sil)"]
        end

        Options["Options Page<br/>(provider key UI'a yönlendir)"]
    end

    WebApp["Web App<br/>(app.kelepir.tr)"]
    API["Backend API"]

    SHPage --> Parser
    SHPage --> Collector
    Parser --> MsgRouter
    Collector --> MsgRouter
    Detector --> MsgRouter
    MsgRouter --> AuthBridge
    AuthBridge --> APIClient
    APIClient --> API
    MsgRouter --> Panel
    PanelApp --> APIClient
    AuthBridge <--> WebApp
    Options --> WebApp
```

---

## 6. Sequence — "Kullanıcı sahibinden'de ilan açıyor, skor görüyor"

```mermaid
sequenceDiagram
    autonumber
    actor U as Kullanıcı
    participant SH as sahibinden tab
    participant CS as Content Script
    participant SW as Service Worker
    participant SP as Side Panel
    participant API as Backend API
    participant DB as Postgres
    participant LLM as LLM Gateway
    participant Prov as Provider (Groq)

    U->>SH: İlan detayına tıklar
    SH-->>CS: Sayfa yüklendi
    CS->>CS: DOM parse (selectors v3)
    CS->>SW: parsed_ilan {json}
    SW->>API: POST /ilanlar/analyze {ilan, ext_token}
    API->>DB: Save ilan + find comparables
    DB-->>API: comparable_set (24 ilan)
    API->>API: Scoring engine v0 → 78 (Kelepir)
    API->>DB: Save scoring_result
    API-->>SW: {score, breakdown, warnings}
    SW->>SP: render(score)
    SP-->>U: 📊 Skor: 78 (Kelepir)
    U->>SP: "Neden bu skor?"
    SP->>SW: chat_request
    SW->>API: POST /chat (taskType: score-explanation)
    API->>LLM: chat(messages, taskType: score-explanation)
    LLM->>LLM: Router → DeepSeek V3
    LLM->>Prov: OpenAI-compat call (user's BYOK key from IDB)
    Prov-->>LLM: stream tokens
    LLM-->>API: stream
    API-->>SW: stream (SSE)
    SW-->>SP: stream chunk
    SP-->>U: "Bu ilan medyan altında, çünkü..."
```

---

## 7. Sequence — V2 "Aboneliğe geçiş + managed proxy"

```mermaid
sequenceDiagram
    autonumber
    actor U as Kullanıcı (Beta'da BYOK kullanıyor)
    participant Web as Web App
    participant API as Backend API
    participant Stripe as Stripe
    participant Vault as Supabase Vault
    participant LLM as LLM Gateway

    U->>Web: "Pro'ya geç" tıklar
    Web->>API: POST /subscriptions/checkout
    API->>Stripe: Create checkout session
    Stripe-->>API: checkout_url
    API-->>Web: redirect_url
    Web->>U: Stripe checkout page (yeni sekme)
    U->>Stripe: Kart bilgilerini gir
    Stripe-->>U: Ödeme başarılı
    Stripe->>API: webhook: subscription.created
    API->>API: DB: subscriptions.status = 'active'
    API->>U: email: "Pro tier aktif!"

    Note over U,LLM: Sonraki LLM çağrısı
    U->>Web: Yeni ilan analizi
    Web->>API: POST /ilanlar/analyze + LLM chat
    API->>API: Check subscription tier → Pro
    API->>LLM: chat(messages, keyResolver: platform_pool)
    LLM->>Vault: getKey('anthropic')
    Vault-->>LLM: platform_anthropic_key
    LLM->>LLM: Adapter chat with platform key
    LLM-->>API: response (cost tracked to platform, not user)
    API->>API: usage_events.key_source = 'platform_pool'
    API->>API: quota_usage += 1
```

---

## 8. Deployment Diagram

```mermaid
flowchart TB
    subgraph Internet["🌐 Internet"]
        Users["Users (TR)"]
        CDN["Cloudflare CDN"]
    end

    subgraph Vercel["Vercel Edge Network"]
        NextApp["Next.js (Edge Runtime)"]
        EdgeFns["Edge Functions"]
    end

    subgraph FlyIO["Fly.io (eu-fra)"]
        APINode["NestJS API<br/>(2 instances, auto-scale)"]
        Redis["Redis 7<br/>(persistent)"]
    end

    subgraph SupaCloud["Supabase (eu-central-1)"]
        SBPG[("Postgres 16<br/>+ pgvector")]
        SBAuth["Auth Service"]
        SBStorage["Object Storage"]
        SBRealtime["Realtime WS"]
    end

    subgraph ExternalLLM["LLM Providers"]
        GroqEP["api.groq.com"]
        GemEP["generativelanguage.googleapis.com"]
        DSEP["api.deepseek.com"]
        AntEP["api.anthropic.com"]
    end

    subgraph ExternalData["Open Data"]
        TUIK["data.tuik.gov.tr"]
        AFAD["afad.gov.tr"]
        OSM["overpass-api.de"]
    end

    subgraph V2Stripe["V2: Stripe"]
        StripeAPI["api.stripe.com"]
        StripeWH["Webhook endpoint"]
    end

    Users --> CDN
    CDN --> Vercel
    Vercel --> FlyIO
    FlyIO --> SupaCloud
    FlyIO --> ExternalLLM
    FlyIO --> ExternalData
    FlyIO -.V2.-> V2Stripe
    Vercel -.WS.-> SBRealtime
```

---

## 9. Data Flow — "Bir ilan, A'dan Z'ye"

```mermaid
flowchart LR
    subgraph Ingest["Ingestion"]
        A["Kullanıcı sahibinden'de gezinir"]
        B["Extension DOM parse"]
        C["POST /ilanlar"]
        D["Normalize + validate"]
        E["DB insert"]
    end

    subgraph Enrich["Enrichment"]
        F["Geocode (OSM)"]
        G["AFAD PGA lookup"]
        H["TÜİK mahalle lookup"]
        I["DB update"]
    end

    subgraph Score["Scoring"]
        J["Comparable set sorgu"]
        K["FiyatAvantajı"]
        L["Kalite + Konum + Risk"]
        M["Composer → 0-100"]
        N["DB scoring_results"]
    end

    subgraph Explain["AI Explain"]
        O["LLM Gateway"]
        P["DeepSeek V3 (BYOK)"]
        Q["Stream response"]
        R["UI render"]
    end

    A --> B --> C --> D --> E
    E --> F --> G --> H --> I
    I --> J --> K
    J --> L --> M --> N
    N --> O --> P --> Q --> R
```

---

## 10. Açıklama Notları

- **Senkron mu, async mı?** Skorlama senkron (kullanıcı bekler), enrichment async (kuyrukta — Geocode + AFAD ilk çekimde 2-5s sürebilir; mahalle bazlı sonuçlar cache'lenir).
- **Cache stratejisi:** Redis'te `ilan:{id}:score:v1` 24h TTL; `mahalle:{kod}:enrich` 7g TTL; `prompt:{hash}` 1h TTL.
- **Realtime:** Yeni ilan ingest → Supabase Realtime ile dashboard'daki "yeni ilan geldi" toast.
- **Rate limit:** Per user 60 RPM, per provider key 30 RPM (free tier dostu).
- **Idempotency:** Ingestion `POST /ilanlar` `Idempotency-Key` header bekler (extension URL hash'i).
- **Multi-region:** MVP'de eu-fra (Frankfurt) tek bölge; V3'te eu-istanbul opsiyonu (Türkiye veri tutma yasal gereği için).

---

## 11. Render İçin

Bu dosyadaki tüm Mermaid blokları:

- GitHub README'de native render eder
- VS Code'da "Markdown Preview Mermaid Support" extension ile preview
- mermaid-cli ile PNG/SVG export: `mmdc -i 05-sistem-mimarisi-diyagram.md -o diagrams/`
- mermaid.live editorde tek tek paste edip render edebilirsin

İlerleyen fazlarda bu diyagramlar otomatik build pipeline'ında SVG'ye export edilip dokümantasyon sitesine (Docusaurus veya VitePress) gömülür.
