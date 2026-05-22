# @pusula/agents

> Pusula multi-agent runtime — Tier 0-3 hiyerarşik agent sistemi.
> Detaylı tasarım: `docs/11-multi-agent-mimarisi.md`

## Yapı

```
src/
├── index.ts
├── orchestrator/         # Tier 0
│   ├── Orchestrator.ts          # Pusula Brain
│   ├── IntentClassifier.ts
│   ├── StateMachine.ts          # XState
│   └── types.ts
├── specialists/          # Tier 1 — 9 specialist agent
│   ├── ScoringAgent.ts
│   ├── ComparableAgent.ts
│   ├── LocationAgent.ts
│   ├── RiskAgent.ts
│   ├── VisionAgent.ts
│   ├── NlpAgent.ts
│   ├── MarketAgent.ts
│   ├── NegotiationAgent.ts
│   ├── MarketingAgent.ts
│   └── index.ts
├── background/           # Tier 2 — 4 cron/event agent
│   ├── CollectorAgent.ts
│   ├── ValidatorAgent.ts
│   ├── TrendAgent.ts
│   ├── NotificationAgent.ts
│   └── index.ts
├── tools/                # Tier 3 — stateless tool workers
│   ├── osm.ts
│   ├── afad.ts
│   ├── tuik.ts
│   ├── embedding.ts
│   ├── vision.ts
│   └── index.ts
├── contracts/            # Zod schema'lı agent kontratları
│   ├── scoring.ts
│   ├── comparable.ts
│   ├── location.ts
│   ├── risk.ts
│   ├── vision.ts
│   ├── nlp.ts
│   ├── market.ts
│   ├── negotiation.ts
│   ├── marketing.ts
│   ├── common.ts
│   └── index.ts
└── runtime/              # Çapraz kesişim altyapısı
    ├── AgentBus.ts              # Inter-agent messaging
    ├── TelemetryProvider.ts     # OpenTelemetry
    ├── FailureModes.ts          # FMEA enforcement
    ├── Logger.ts
    └── index.ts

tests/
├── contracts/            # Agent kontrat testleri
└── stubs/                # Agent stub testleri
```

## Kullanım

```typescript
import { Orchestrator } from '@pusula/agents/orchestrator';
import { LLMGateway } from '@pusula/llm-gateway';

const brain = new Orchestrator({
  llmGateway: new LLMGateway({ /* ... */ }),
  logger,
  telemetry,
});

const reply = await brain.handle({
  user_id,
  thread_id,
  message: 'Bu daireyi nasıl buluyorsun? https://...',
  persona: 'buyer',
});
```

## Statü

**MVP iskelet.** Çalışan kod stub düzeyinde — gerçek mantık V1 sprint'inde tamamlanacak. Şu an:

- ✅ Tüm interface'ler tanımlı
- ✅ Zod kontratları yazıldı
- ✅ Orchestrator state machine iskelet
- ✅ IntentClassifier basit kural-tabanlı
- ⚠️ Specialist agent stub'lar (sadece mock data)
- ❌ Background queue çalışan kod
- ❌ Vision/NLP gerçek LLM çağrıları

## Test

```bash
pnpm --filter @pusula/agents test
pnpm --filter @pusula/agents test:contracts  # CI gating
```
