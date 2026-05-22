# 🧭 Pusula Dokümantasyonu

> **Karar verirken kaybolma.**

Pusula platformunun tasarım, mimari, ürün ve pazarlama dokümanları. Repo ile birlikte
versiyon kontrolünde tutulur.

## İçindekiler

| #   | Dosya                                                                       | Konu                                                                               |
| --- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| 02  | [ADR-001 — Mimari Kararlar](./02-ADR-001-mimari-kararlar.md)                | 12 mimari karar (D1-D12), alternatif analizi, V2 ticarileşme stratejisi, DB şeması |
| 03  | [Skorlama Modeli v0](./03-skorlama-modeli.md)                               | İlk deterministik kelepir formülü (`10` ile süperşede)                             |
| 04  | [Provider × Model Matrisi](./04-provider-model-matrisi.md)                  | Groq/Gemini/DeepSeek/Anthropic karşılaştırma, routing, Settings UI                 |
| 05  | [Sistem Mimarisi Diyagramları](./05-sistem-mimarisi-diyagram.md)            | C4-style Mermaid (Context, Container, Component, Sequence)                         |
| 06  | [Roadmap](./06-roadmap.md)                                                  | MVP → V3, KPI hedefleri, risk matrisi                                              |
| 07  | [Doğrulama Notları](./07-dogrulama-notlari.md)                              | Tutarlılık kontrolü, bilinen eksiklikler                                           |
| 08  | [Pazarlama Stratejisi](./08-pazarlama-stratejisi.md)                        | Marka rehberi, personalar, lansman planı, KPI                                      |
| 09  | [Proje Denetim Raporu](./09-proje-denetim-raporu.md)                        | Tam audit + P0/P1/P2 bulguları + 22 May uygulama özeti                             |
| 10  | [AAA Skorlama Motoru Spec](./10-aaa-skorlama-spec.md)                       | 8 pillar, 80+ parametre, anomaly, multi-vertical (`03`'ün halefi)                  |
| 11  | [Multi-Agent Mimarisi](./11-multi-agent-mimarisi.md)                        | Tier 0-3 hiyerarşi, 14 agent, FMEA, SLO                                            |
| 12  | [Konuşmasal Mod Spec](./12-konusmasal-mod-spec.md)                          | Persona modelleri, XState state machine, slash command, NL üretim kuralları        |
| 13  | [Veri Mevcudiyeti & Dinamik Skor](./13-veri-mevcudiyeti-ve-dinamik-skor.md) | Fallback chain, confidence calculus, dinamik ağırlık dağıtımı                      |
| 14  | [Kalibrasyon & Deney Protokolü](./14-kalibrasyon-ve-deney-protokolu.md)     | 3-fazlı kalibrasyon, NDCG/Spearman/MAPE, A/B test, drift detection                 |
| 15  | [Observability & SLO](./15-observability-ve-slo.md)                         | Log/metric/trace 3 direği, SLO hiyerarşisi, alerting, incident response            |
| 16  | [Test Stratejisi](./16-test-stratejisi.md)                                  | Unit → contract → integration → E2E → chaos piramidi, ML regression                |

## Doküman Bakımı

- Mimari değişiklik → yeni ADR ekle (`docs/ADR-NNN-...md`), eskiyi `Superseded` işaretle
- Skor formülü değişikliği → `SCORING_FORMULA_VERSION` bump et (`packages/shared/src/constants/index.ts`)
- Provider matrisini her ay gözden geçir (LLM fiyatları hareketli)
- Roadmap'i her 90 günde bir refresh et
- Multi-agent kontratı değiştiyse → `packages/agents/src/contracts/*` + ilgili agent stub güncellenmeli
