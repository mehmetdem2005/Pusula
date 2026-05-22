# Provider × Model Matrisi v1

**Date:** 21 Mayıs 2026
**Scope:** LLM Gateway tarafından desteklenecek modeller, görev önerileri, BETA (BYOK) ve V2 (Managed) fiyatlandırma.
**Source:** Mayıs 2026 itibariyle resmi fiyatlandırma sayfaları (linkler altta).

> ⚠️ Fiyatlar ve free tier limitler aylık değişebiliyor. `packages/llm-gateway/src/pricing.ts` içinde version'lı tablo + günlük cron monitor + Slack/Discord webhook alarm önerilir.

---

## 1. Hızlı Karar Matrisi

| Görev tipi | 1. Tercih | 2. Tercih (failover) | 3. Tercih | Gerekçe |
|---|---|---|---|---|
| **Hızlı chat / kısa cevap** | Groq `llama-3.3-70b-versatile` | Gemini `2.5-flash-lite` | DeepSeek `chat` | Hız + ucuzluk |
| **Skor açıklaması** | DeepSeek `chat` (V3) | Groq `llama-3.3-70b-versatile` | Claude `haiku-4.5` | Düşük maliyet, yapılandırılmış çıktı iyi |
| **Pazarlama metni** | Claude `sonnet-4-6` | Gemini `2.5-pro` | DeepSeek `chat` | Türkçe yazım kalitesi |
| **Akıl yürütme (kelepir mantığı)** | DeepSeek `reasoner` (R1) | Claude `opus-4-7` | Gemini `2.5-pro` | Reasoning + en ucuz reasoning modeli |
| **Fotoğraf analizi (vision)** | Gemini `2.5-flash` | Claude `haiku-4.5` | Claude `sonnet-4-6` | Vision + ucuz |
| **Uzun rapor (50+ ilan toplu)** | Gemini `2.5-pro` (1M ctx) | Claude `sonnet-4-6` (1M ctx) | DeepSeek (131K) | Geniş context |
| **Tool use / agent loop** | Claude `sonnet-4-6` | DeepSeek V3.2 | Gemini `2.5-pro` | Tool use güvenilirliği |

---

## 2. Tam Provider × Model Tablosu

### 2.1 Groq

Çok hızlı inference (300+ TPS). Free tier cömert. Vision sınırlı.

| Model | Whitelist? | Input ($/M) | Output ($/M) | Context | Vision | JSON | Tools | Hız | Türkçe |
|---|---|---|---|---|---|---|---|---|---|
| `llama-3.3-70b-versatile` | ✅ default | $0.59 | $0.79 | 131K | ❌ | ✅ | ✅ | ⚡⚡⚡ | İyi |
| `llama-3.1-8b-instant` | ✅ | $0.05 | $0.08 | 131K | ❌ | ✅ | ⚠️ | ⚡⚡⚡⚡ | Orta |
| `mixtral-8x7b-32768` | ⚠️ legacy | $0.24 | $0.24 | 32K | ❌ | ✅ | ⚠️ | ⚡⚡⚡ | Orta |
| `gemma2-9b-it` | ❌ skip | — | — | — | ❌ | — | — | — | Zayıf |

**Free tier:** 30 RPM / 6K TPM / 14.4K RPD (most models). Developer tier (free with credit card): 10x limit + 25% discount.

**Notlar:**
- Türkçe için `llama-3.3-70b` mükemmel olmasa da yeterli, hız avantajı büyük.
- Vision modeli yok şu an. Vision görevleri Gemini/Claude'a yönlendir.
- "Forever free" plan mevcut, ama production için Developer tier şart.
- Prompt cache var — sistem prompt'u sabit tutulursa tier'ı uzatır.

**Kullanım önerisi:** Quick chat ve score-explanation görevleri için **default**. Vision için kullanma.

---

### 2.2 Google Gemini

⚠️ **DİKKAT:** Gemini 2.0 Flash **18 Şubat 2026'da deprecate edildi, 1 Haziran 2026'da kapanıyor.** Whitelist'imiz 2.5 ve 3.x serisi olmalı.

| Model | Whitelist? | Input ($/M) | Output ($/M) | Context | Vision | JSON | Tools | Hız | Türkçe |
|---|---|---|---|---|---|---|---|---|---|
| `gemini-2.5-pro` | ✅ premium | $1.25 | $5.00 (paid only) | 2M | ✅ | ✅ | ✅ | ⚡⚡ | Çok iyi |
| `gemini-2.5-flash` | ✅ default | $0.30 | $2.50 | 1M | ✅ | ✅ | ✅ | ⚡⚡⚡ | İyi |
| `gemini-2.5-flash-lite` | ✅ ucuz | $0.10 | $0.40 | 1M | ✅ | ✅ | ✅ | ⚡⚡⚡ | İyi |
| `gemini-3-flash` | ✅ yeni | TBD | TBD | 1M | ✅ | ✅ | ✅ | ⚡⚡⚡ | İyi |
| `gemini-3.1-flash-lite` | ✅ ucuz+ | TBD | TBD | 1M | ✅ | ✅ | ✅ | ⚡⚡⚡⚡ | İyi |
| `gemini-2.0-flash` | ❌ deprecated | — | — | — | — | — | — | — | — |
| `gemini-1.5-pro` | ❌ deprecated | — | — | — | — | — | — | — | — |

**Free tier (Mayıs 2026):**
- Sadece Flash ve Flash-Lite modellerde
- 5-15 RPM, 100-1.500 RPD
- 250K TPM (tüm modeller)
- **Pro modeller artık paid only** (April 2026'dan beri)

**Notlar:**
- Vision desteği tüm 2.5 serisinde mevcut — fotoğraf analizi için ideal.
- 1M-2M context window — uzun rapor / batch analiz için tek seçenek (Claude 1M ile rekabet eder).
- API key Google AI Studio'dan **ücretsiz** alınabilir.

**Kullanım önerisi:** Vision görevleri için **default**. Uzun raporlar için 2.5 Pro. Quick işler için 2.5 Flash-Lite.

---

### 2.3 DeepSeek

Çin merkezli, OpenAI-uyumlu API, **çok ucuz**, off-peak %50-75 indirim. Reasoning modeli (R1) eşsiz değer.

| Model | Whitelist? | Input ($/M) | Output ($/M) | Context | Vision | JSON | Tools | Hız | Türkçe |
|---|---|---|---|---|---|---|---|---|---|
| `deepseek-chat` (V3) | ✅ default | $0.14 | $0.28 | 131K | ❌ | ✅ | ✅ | ⚡⚡ | İyi |
| `deepseek-reasoner` (R1) | ✅ reasoning | $0.55 | $2.19 | 131K | ❌ | ✅ | ⚠️ | ⚡ | İyi |
| `deepseek-v3.2` | ✅ yeni | $0.14 | $0.28 | 131K-1M | ❌ | ✅ | ✅ | ⚡⚡ | İyi |
| `deepseek-v4-flash` | ⚠️ test | $0.14 | $0.28 | 1M | ❌ | ✅ | ✅ | ⚡⚡ | TBD |

**İndirimler:**
- Cache hit fiyatı = launch price'ın 1/10'u (Nisan 2026'dan beri)
- Off-peak (16:30-00:30 GMT): R1 için %75, V3 için %50 indirim

**Notlar:**
- OpenAI uyumlu — adapter en kolay yazılır (Groq ile aynı).
- Vision yok. Foto için Gemini/Claude.
- Reasoning model (R1), kelepir analizinde "neden bu fiyat ucuz" mantık zinciri için **en ucuz reasoning modeli** (Claude Opus'tan ~10x ucuz).
- Türkçe performansı V3'te şaşırtıcı derecede iyi.
- Coğrafi risk: Çin merkezli, KVKK perspektifinde "kişisel veriyi yurt dışına aktarma" rejimine giriyor. **Beta kullanıcısına bilgi notu şart.**

**Kullanım önerisi:** Score-explanation, reasoning, off-peak batch işler için **default**. Hassas kişisel veri içeren prompt'larda kullanma.

---

### 2.4 Anthropic Claude

En kaliteli yazım çıktısı, en güvenilir tool use, vision Haiku/Sonnet/Opus'ta var. En pahalı seçenek.

| Model | Whitelist? | Input ($/M) | Output ($/M) | Context | Vision | JSON | Tools | Hız | Türkçe |
|---|---|---|---|---|---|---|---|---|---|
| `claude-opus-4-7` | ✅ premium | $5.00 | $25.00 | 1M | ✅ (2576px) | ✅ | ✅ | ⚡ | En iyi |
| `claude-sonnet-4-6` | ✅ default | $3.00 | $15.00 | 1M | ✅ | ✅ | ✅ | ⚡⚡ | Mükemmel |
| `claude-haiku-4-5` | ✅ ucuz | $1.00 | $5.00 | 200K | ✅ | ✅ | ✅ | ⚡⚡⚡ | Çok iyi |
| `claude-opus-4-6` | ⚠️ legacy | $5.00 | $25.00 | 1M | ✅ | ✅ | ✅ | ⚡ | En iyi |

**İndirimler:**
- Prompt cache: cached input -%90
- Batch processing: -%50 tüm modellerde

**Notlar:**
- **CORS yok** — browser-direct çağrı çalışmaz, backend proxy şart.
- Tool use ve structured output en güvenilir.
- Türkçe en kaliteli — pazarlama metni, müşteri mesajı, profesyonel iletişim için tartışmasız 1.
- Opus 4.7 yeni tokenizer ~%35 daha fazla token üretebiliyor (aynı input için maliyet artabilir).
- Vision Opus 4.7'de 3.75MP'a kadar — yüksek çözünürlük fotoğraf analizi için en iyi.

**Kullanım önerisi:** Pazarlama metni, müşteri mesajı, premium kullanıcı chat'i için **default**. Reasoning için Opus 4.7 (ama pahalı). Foto için Haiku 4.5.

---

## 3. Maliyet Karşılaştırma — Tipik İlan Analizi Senaryosu

Bir konut ilanı analizi için tipik LLM çağrı seti:

| İşlem | Input token (avg) | Output token (avg) |
|---|---|---|
| Skor açıklaması | 800 | 250 |
| AI chat (3 mesaj turu) | 1.500 | 600 |
| Pazarlama metni (kısa) | 600 | 400 |
| Pazarlama metni (sosyal post) | 600 | 200 |
| Vision (1 foto analizi) | 1.200 (image+text) | 200 |
| **TOPLAM** | **4.700** | **1.650** |

| Provider/Model | Toplam Maliyet (1 ilan) | 100 ilan | 1.000 ilan |
|---|---|---|---|
| Groq Llama 3.3 70B (vision yok) | $0.0040 | $0.40 | $4.00 |
| Gemini 2.5 Flash | $0.0055 | $0.55 | $5.50 |
| Gemini 2.5 Flash-Lite | $0.0011 | $0.11 | $1.10 |
| DeepSeek V3 | $0.0011 | $0.11 | $1.10 |
| DeepSeek V3 (off-peak) | $0.00055 | $0.055 | $0.55 |
| Claude Haiku 4.5 | $0.0130 | $1.30 | $13.00 |
| Claude Sonnet 4.6 | $0.0388 | $3.88 | $38.80 |
| Claude Opus 4.7 | $0.0648 | $6.48 | $64.80 |
| **Optimal Mix*** | $0.0027 | $0.27 | $2.70 |

> *Optimal Mix: Skor açıklama → DeepSeek V3, Chat → Groq Llama 3.3, Pazarlama → Claude Sonnet, Vision → Gemini 2.5 Flash. Free tier dahil değil — sadece ücretli kısım.

**Yıllık projeksiyon (orta yoğunluklu kullanıcı, 30 ilan/ay):**

- Optimal mix: ~$1/yıl
- Claude Sonnet sadece: ~$14/yıl
- Free tier sınırı dahilinde: $0/yıl

V2 abonelik fiyatlandırması bu maliyetleri kolayca karşılar.

---

## 4. LLM Gateway Adapter Tasarımı

### 4.1 Modül yapısı

```
packages/llm-gateway/
├── src/
│   ├── adapters/
│   │   ├── base.ts                 # Soyut base + OpenAI-compat helper
│   │   ├── groq.ts                 # OpenAI-compat (api.groq.com)
│   │   ├── deepseek.ts             # OpenAI-compat (api.deepseek.com)
│   │   ├── gemini.ts               # Google SDK
│   │   ├── anthropic.ts            # Anthropic SDK
│   │   └── openrouter.ts           # OpenRouter fallback (V1+ ekstra)
│   ├── routing.ts                  # task-type → model defaults
│   ├── pricing.ts                  # versiyonlu fiyat tablosu
│   ├── failover.ts                 # 429/5xx → next provider
│   ├── key-resolver.ts             # user_byok | platform_pool
│   ├── usage-tracker.ts            # cost + token kayıt
│   ├── prompts/
│   │   ├── score-explanation.ts
│   │   ├── marketing.ts
│   │   └── reasoning.ts
│   ├── types.ts
│   └── index.ts
├── package.json
└── tsconfig.json
```

### 4.2 Settings UI Spec (Beta için)

```
┌─ Settings → AI Providers ─────────────────────────────────────┐
│                                                                │
│  🚧 Beta: Kendi API key'inizi kullanıyorsunuz. V2'de           │
│  abonelik ile key'siz erişim açılacak.                         │
│                                                                │
│ ── Groq ──────────────────────────────────────────  [Aktif ▼]│
│  API Key:  [gsk_••••••••••••••••••••••••]  [👁]  [🧪 Test]    │
│  Whitelist: ✅ llama-3.3-70b-versatile                         │
│             ✅ llama-3.1-8b-instant                            │
│             ⬜ mixtral-8x7b (legacy)                            │
│  Kullanım: 247/14.400 RPD  •  $0.00/ay                         │
│                                                                │
│ ── Google Gemini ───────────────────────────────────  [Aktif]│
│  API Key:  [AIza••••••••••••••••••••••••]  [👁]  [🧪 Test]    │
│  Whitelist: ✅ gemini-2.5-flash (default)                      │
│             ✅ gemini-2.5-flash-lite                           │
│             ✅ gemini-2.5-pro (paid)                           │
│  Kullanım: 89/1.500 RPD  •  $0.32/ay                           │
│                                                                │
│ ── DeepSeek ──────────────────────────────────────  [Aktif] │
│  API Key:  [sk-••••••••••••••••••••••••]  [👁]  [🧪 Test]     │
│  Whitelist: ✅ deepseek-chat (V3, default)                     │
│             ✅ deepseek-reasoner (R1)                          │
│  ⚠️ DeepSeek Çin merkezli — hassas veri göndermeyin            │
│  Kullanım: 2.341 çağrı  •  $0.18/ay                            │
│                                                                │
│ ── Anthropic Claude ──────────────────────────────  [Aktif] │
│  API Key:  [sk-ant-••••••••••••••••••••••••]  [👁]  [🧪 Test] │
│  Whitelist: ✅ claude-haiku-4-5                                │
│             ✅ claude-sonnet-4-6 (default)                     │
│             ⬜ claude-opus-4-7 (pahalı, manuel aç)              │
│  ⚠️ CORS yok → backend proxy üzerinden çağrı yapılıyor          │
│  Kullanım: 156 çağrı  •  $3.82/ay                              │
│                                                                │
│ ── Görev → Model varsayılanları ──────────────────────────── │
│  Hızlı chat:           [Groq Llama 3.3 70B ▼]                  │
│  Skor açıklaması:      [DeepSeek V3 ▼]                         │
│  Pazarlama metni:      [Claude Sonnet 4.6 ▼]                   │
│  Reasoning:            [DeepSeek R1 ▼]                         │
│  Fotoğraf analizi:     [Gemini 2.5 Flash ▼]                    │
│  Uzun rapor:           [Gemini 2.5 Pro ▼]                      │
│                                                                │
│  Failover sırası: Groq → Gemini → DeepSeek → Anthropic         │
│  [Auto-failover etkin ✓]                                       │
│                                                                │
└──────────────────────────────────────────────────────────────┘
```

---

## 5. V2 Managed Mode'da Plan-Model Eşleştirme

| Plan | Erişilebilir modeller |
|---|---|
| Free (BYOK) | Tümü (kullanıcı key'i ile) |
| Starter | DeepSeek V3, Groq Llama, Gemini Flash-Lite, Claude Haiku |
| Pro | + Gemini 2.5 Pro, Claude Sonnet 4.6, DeepSeek R1 |
| Pro+ / Enterprise | + Claude Opus 4.7, custom fine-tuned, on-prem |

---

## 6. Kaynaklar

| Provider | Pricing | Models | Docs |
|---|---|---|---|
| Groq | [groq.com/pricing](https://groq.com/pricing) | [console.groq.com/docs/models](https://console.groq.com/docs/models) | [console.groq.com/docs](https://console.groq.com/docs) |
| Gemini | [ai.google.dev/gemini-api/docs/pricing](https://ai.google.dev/gemini-api/docs/pricing) | [ai.google.dev/gemini-api/docs/models](https://ai.google.dev/gemini-api/docs/models) | [ai.google.dev](https://ai.google.dev) |
| DeepSeek | [api-docs.deepseek.com/quick_start/pricing](https://api-docs.deepseek.com/quick_start/pricing/) | [api-docs.deepseek.com](https://api-docs.deepseek.com) | — |
| Anthropic | [anthropic.com/pricing](https://www.anthropic.com/pricing) | [docs.claude.com/en/docs/about-claude/models](https://docs.claude.com/en/docs/about-claude/models) | [docs.claude.com](https://docs.claude.com) |

Sources:
- [Groq Pricing](https://groq.com/pricing)
- [Groq Rate Limits 2026](https://tokenmix.ai/blog/groq-free-tier-limits-2026)
- [Gemini API Pricing](https://ai.google.dev/gemini-api/docs/pricing)
- [Gemini Free Tier 2026](https://yingtu.ai/en/blog/gemini-api-free-tier)
- [DeepSeek API Pricing](https://api-docs.deepseek.com/quick_start/pricing/)
- [DeepSeek V3 Pricing Guide](https://deploybase.ai/articles/deepseek-api-pricing)
- [Claude API Pricing 2026](https://benchlm.ai/blog/posts/claude-api-pricing)
- [Anthropic Claude API Pricing 2026](https://www.cloudzero.com/blog/anthropic-claude-api-pricing/)
