/**
 * VisionAgent — Tier 1, multi-modal
 * docs/11-multi-agent-mimarisi.md §4.5, docs/10-aaa-skorlama-spec.md §3.5
 */
import { z } from 'zod';
import { VisionRequest, VisionResponse } from '../contracts/vision.js';
import type { Logger } from '../runtime/Logger.js';
import type { LLMGateway } from '@pusula/llm-gateway';

export class VisionAgent {
  static readonly name = 'vision' as const;
  static readonly inputSchema = VisionRequest;
  static readonly outputSchema = VisionResponse;

  constructor(private llmGateway: LLMGateway, private logger: Logger) {}

  async handle(req: z.infer<typeof VisionRequest>): Promise<z.infer<typeof VisionResponse>> {
    this.logger.info('VisionAgent.handle', { trace_id: req.trace_id, foto_count: req.foto_urlleri.length });

    if (req.foto_urlleri.length === 0) {
      return {
        result: {
          foto_count: 0,
          hidden_defects: [],
          lens_distortion_detected: false,
          perceived_room_size_inconsistency: false,
          structural_inconsistencies: [],
          notes: 'Fotoğraf bulunamadı',
        },
        model_used: 'none',
        cost_usd: 0,
        trace_id: req.trace_id,
      };
    }

    // TODO: Gemini 2.5 Flash veya Claude Haiku vision çağrısı
    // - Sistem promptu docs/10-aaa-skorlama-spec.md §3.5'te
    // - JSON schema enforce
    // - Cache (Redis) foto hash bazlı
    return {
      result: {
        foto_count: req.foto_urlleri.length,
        hidden_defects: [],
        lens_distortion_detected: false,
        perceived_room_size_inconsistency: false,
        structural_inconsistencies: [],
        notes: 'MVP stub — Vision LLM çağrısı V1\'de aktif',
      },
      model_used: 'stub',
      cost_usd: 0,
      trace_id: req.trace_id,
    };
  }
}
