/**
 * Pusula Brain — Tier 0 Orchestrator.
 *
 * Sorumluluk:
 *  - Intent classification
 *  - Specialist agent dispatch (function call tarzı)
 *  - State machine yönetimi
 *  - LLM ile sonuç birleştirme (doğal dil sentezi)
 *
 * docs/11-multi-agent-mimarisi.md §3'e ve docs/12-konusmasal-mod-spec.md'ye uygun.
 *
 * NOT: Bu MVP iskelet. Gerçek LLM sentez ve tool routing V1'de tamamlanacak.
 */
import { z } from 'zod';
import type { LLMGateway } from '@pusula/llm-gateway';
import { BrainInput, BrainOutput } from './types.js';
import { IntentClassifier } from './IntentClassifier.js';
import type { AgentBus } from '../runtime/AgentBus.js';
import type { Logger } from '../runtime/Logger.js';
import type { TelemetryProvider } from '../runtime/TelemetryProvider.js';
import { GuardedExecution } from '../runtime/FailureModes.js';
import type { UserPersona } from '../contracts/common.js';

export interface OrchestratorDeps {
  llmGateway: LLMGateway;
  agentBus: AgentBus;
  logger: Logger;
  telemetry: TelemetryProvider;
}

export class Orchestrator {
  private classifier = new IntentClassifier();
  private guards = new GuardedExecution({ timeoutMs: 12000, maxCostUsd: 0.50, maxDepth: 6 });

  constructor(private deps: OrchestratorDeps) {}

  async handle(input: z.infer<typeof BrainInput>): Promise<z.infer<typeof BrainOutput>> {
    const parsed = BrainInput.parse(input);
    const trace_id = crypto.randomUUID();
    const span = this.deps.telemetry.startSpan('orchestrator.handle', {
      'pusula.user_id': parsed.user_id,
      'pusula.thread_id': parsed.thread_id,
    });

    const startTime = Date.now();
    try {
      // 1. Intent classification
      const intentResult = this.classifier.classify(parsed.message, !!parsed.persona);
      this.deps.logger.info('Intent classified', {
        intent: intentResult.intent,
        confidence: intentResult.confidence,
        trace_id,
      });

      // 2. Persona belirleme
      const persona: UserPersona = parsed.persona ?? this.intentToPersona(intentResult.intent) ?? 'buyer';

      // 3. Agent dispatch (MVP'de tek tip - V1'de full function calling)
      const agentsInvoked: string[] = [];
      const totalCost = 0;

      // TODO: intent'e göre uygun specialist agent'ları çağır
      //   - task.analyze_listing → ScoringAgent + ComparableAgent + LocationAgent + RiskAgent
      //   - task.compare_listings → her ilan için ScoringAgent paralel
      //   - task.negotiation_advice → NegotiationAgent
      //   - task.create_marketing → MarketingAgent
      //   - vs.

      // 4. LLM ile sentez (placeholder)
      const replyText = await this.synthesizeReply(parsed.message, intentResult, persona);

      const result: z.infer<typeof BrainOutput> = {
        thread_id: parsed.thread_id,
        reply: { text: replyText },
        metadata: {
          intent: intentResult.intent,
          persona,
          agents_invoked: agentsInvoked as never,
          total_latency_ms: Date.now() - startTime,
          cost_usd: totalCost,
          cache_hits: 0,
          trace_id,
        },
        next_suggestions: this.suggestNext(intentResult.intent, persona),
      };

      span.end();
      return result;
    } catch (err) {
      this.deps.telemetry.recordError(span, err);
      span.end();
      throw err;
    }
  }

  private intentToPersona(intent: string): UserPersona | null {
    if (intent === 'persona.buyer') return 'buyer';
    if (intent === 'persona.seller') return 'agent_seller';
    if (intent === 'persona.investor') return 'investor';
    if (intent === 'persona.researcher') return 'researcher';
    return null;
  }

  private async synthesizeReply(
    userMessage: string,
    intent: ReturnType<IntentClassifier['classify']>,
    persona: UserPersona
  ): Promise<string> {
    // MVP placeholder. V1'de:
    //   - System prompt persona'ya göre
    //   - Agent çıktıları context olarak verilir
    //   - LLM doğal dil yanıt üretir, streaming

    if (intent.confidence < 0.65) {
      return 'Pardon, tam anlayamadım — biraz daha açıklayabilir misin? İstersen şu konularda yardım edebilirim: ilan analizi, mahalle araştırması, pazarlık tavsiyesi veya pazarlama metni.';
    }

    return `[STUB] Persona: ${persona}, Intent: ${intent.intent}. Bu mesaj MVP iskelet — gerçek LLM sentez V1 sprint'inde tamamlanacak.`;
  }

  private suggestNext(intent: string, persona: UserPersona): string[] {
    const suggestions: Record<string, string[]> = {
      'task.analyze_listing': [
        'Bu ilana benzer fırsatları da getireyim mi?',
        'Pazarlık marjını hesaplamamı ister misin?',
      ],
      'task.compare_listings': ['Sonuç ışığında bir öneri yapmamı ister misin?'],
      'task.create_marketing': ['Başka format (Instagram story, email) da ister misin?'],
      'task.market_research': ['Bu mahalledeki en iyi 3 ilanı getireyim mi?'],
    };
    return suggestions[intent] ?? ['Yardımcı olabileceğim başka bir konu var mı?'];
  }
}
