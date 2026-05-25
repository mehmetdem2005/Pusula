import { Body, Controller, Get, Logger, Post, Res, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ChatMessage, ChatOptions, Provider, type ChatResponse } from '@pusula/shared';
import type { Response } from 'express';
import { z } from 'zod';
import { LLMService, type ModelOption } from './llm.service.js';
import { JwtAuthGuard, CurrentUser, type AuthedUser } from '../auth/jwt.guard.js';
import { ZodValidationPipe } from '../common/zod.pipe.js';

const ProviderKeySchema = z.string().min(20).max(500);

const ChatRequest = z.object({
  messages: z.array(ChatMessage).min(1).max(100),
  options: ChatOptions,
  /**
   * Beta: client'tan plaintext API key gelir (master password ile decrypt edildikten sonra).
   * GA'da kaldırılacak — server-side Vault'tan çekilecek.
   */
  provider_keys: z.record(Provider, ProviderKeySchema).optional(),
});

@Controller('llm')
@UseGuards(JwtAuthGuard)
export class LLMController {
  private readonly logger = new Logger(LLMController.name);
  constructor(private readonly svc: LLMService) {}

  @Post('chat')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async chat(
    @CurrentUser() user: AuthedUser,
    @Body(new ZodValidationPipe(ChatRequest)) body: z.infer<typeof ChatRequest>,
  ): Promise<ChatResponse> {
    return this.svc.chat(user.id, body.messages, body.options, body.provider_keys ?? {});
  }

  /**
   * Streaming sohbet (SSE). Token'lar `data: {"delta":"..."}` event'leri olarak akar; biter
   * bitmez `data: {"done":true}`. Sesli modda cümle cümle TTS başlatmayı mümkün kılar.
   * compression() global; SSE'nin tamponlanmaması için `no-transform` + `X-Accel-Buffering: no`.
   */
  @Post('chat/stream')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async chatStream(
    @CurrentUser() user: AuthedUser,
    @Body(new ZodValidationPipe(ChatRequest)) body: z.infer<typeof ChatRequest>,
    @Res() res: Response,
  ): Promise<void> {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();
    try {
      for await (const chunk of this.svc.chatStream(
        user.id,
        body.messages,
        body.options,
        body.provider_keys ?? {},
      )) {
        if (chunk.delta) res.write(`data: ${JSON.stringify({ delta: chunk.delta })}\n\n`);
      }
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'stream hatası';
      this.logger.warn(`chat/stream user=${user.id}: ${msg}`);
      res.write(`data: ${JSON.stringify({ error: msg })}\n\n`);
    } finally {
      res.end();
    }
  }

  /** Sohbet seçicisi için: platform key'lerinin desteklediği chat modelleri. */
  @Get('models')
  async models(): Promise<{ models: ModelOption[] }> {
    return { models: await this.svc.listModels() };
  }
}
