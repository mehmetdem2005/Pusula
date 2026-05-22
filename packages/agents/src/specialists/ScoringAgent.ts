/**
 * ScoringAgent — Tier 1
 *
 * Pure orkestrasyon: @pusula/scoring motorunu çağırır, context'i agent'lardan toplar.
 * Burada LLM yok — sadece deterministik mantık.
 *
 * docs/11-multi-agent-mimarisi.md §4.1, docs/10-aaa-skorlama-spec.md
 */
import { z } from 'zod';
import { kelepirSkoru, type ScoringContext } from '@pusula/scoring';
import { ScoringRequest, ScoringResponse } from '../contracts/scoring.js';
import type { LocationContext } from '../contracts/location.js';
import type { RiskContext } from '../contracts/risk.js';
import type { Logger } from '../runtime/Logger.js';
import type { AgentBus } from '../runtime/AgentBus.js';

export interface ScoringAgentDeps {
  logger: Logger;
  agentBus?: AgentBus; // opsiyonel — verilmezse boş context ile çalışır
}

export class ScoringAgent {
  static readonly name = 'scoring' as const;
  static readonly inputSchema = ScoringRequest;
  static readonly outputSchema = ScoringResponse;

  constructor(private deps: ScoringAgentDeps) {}

  async handle(req: z.infer<typeof ScoringRequest>): Promise<z.infer<typeof ScoringResponse>> {
    const t0 = Date.now();
    const { ilan, context_options, trace_id } = req;
    this.deps.logger.info('ScoringAgent.handle start', {
      trace_id,
      ilan_url: ilan.ilan_url,
    });

    // 1. Pillar context'lerini paralel topla (AgentBus varsa)
    const pillarStart = Date.now();
    const [comparables, konum, risk] = await Promise.all([
      this.fetchComparables(req),
      this.fetchLocation(req),
      this.fetchRisk(req),
    ]);
    const pillar_durations_ms = {
      comparable: Date.now() - pillarStart,
      konum: 0,
      risk: 0,
    };

    // 2. Deterministik skor motoru
    const ctx: ScoringContext = { comparables, konum, risk };
    const result = kelepirSkoru(ilan, ctx);

    const total = Date.now() - t0;
    this.deps.logger.info('ScoringAgent.handle done', {
      trace_id,
      total_duration_ms: total,
      etiket: result.etiket,
      toplam: result.toplam,
    });

    return {
      result,
      pillar_durations_ms,
      total_duration_ms: total,
      trace_id,
    };
  }

  /** ComparableAgent çağırılır (yoksa boş). */
  private async fetchComparables(_req: z.infer<typeof ScoringRequest>): Promise<ScoringContext['comparables']> {
    if (!this.deps.agentBus || !_req.context_options.include_comparables) return [];
    try {
      const resp = await this.deps.agentBus.call<unknown, { items: Array<{ id: string; m2: number; fiyat_tl: number; bina_yasi: number; oda_sayisi: string; mahalle?: string; ilce: string }> }>(
        'comparable',
        {
          ilan_id: _req.ilan.kaynak_id,
          k: 20,
          strategy: 'hybrid',
          trace_id: _req.trace_id,
        },
        { traceId: _req.trace_id, timeoutMs: 3000 },
      );
      return resp.items.map((i) => ({
        id: i.id,
        m2: i.m2,
        fiyat_tl: i.fiyat_tl,
        bina_yasi: i.bina_yasi,
        oda_sayisi: i.oda_sayisi,
        mahalle: i.mahalle,
        ilce: i.ilce,
      }));
    } catch (err) {
      this.deps.logger.warn('ComparableAgent çağrısı başarısız, boş set ile devam', {
        trace_id: _req.trace_id,
        error: (err as Error).message,
      });
      return [];
    }
  }

  private async fetchLocation(_req: z.infer<typeof ScoringRequest>): Promise<LocationContext> {
    if (!this.deps.agentBus) return {};
    try {
      const resp = await this.deps.agentBus.call<unknown, { context: LocationContext }>(
        'location',
        {
          il: _req.ilan.il,
          ilce: _req.ilan.ilce,
          mahalle: _req.ilan.mahalle,
          enlem: _req.ilan.enlem,
          boylam: _req.ilan.boylam,
          trace_id: _req.trace_id,
        },
        { traceId: _req.trace_id, timeoutMs: 3000 },
      );
      return resp.context;
    } catch (err) {
      this.deps.logger.warn('LocationAgent başarısız', { trace_id: _req.trace_id, error: (err as Error).message });
      return {};
    }
  }

  private async fetchRisk(_req: z.infer<typeof ScoringRequest>): Promise<RiskContext> {
    if (!this.deps.agentBus) return {};
    try {
      const resp = await this.deps.agentBus.call<unknown, { context: RiskContext }>(
        'risk',
        {
          enlem: _req.ilan.enlem,
          boylam: _req.ilan.boylam,
          trace_id: _req.trace_id,
        },
        { traceId: _req.trace_id, timeoutMs: 3000 },
      );
      return resp.context;
    } catch (err) {
      this.deps.logger.warn('RiskAgent başarısız', { trace_id: _req.trace_id, error: (err as Error).message });
      return {};
    }
  }
}
