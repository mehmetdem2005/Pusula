import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ChatMessage, ChatOptions, Provider, type ChatResponse } from '@pusula/shared';
import { z } from 'zod';
import { LLMService } from './llm.service.js';
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
  constructor(private readonly svc: LLMService) {}

  @Post('chat')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async chat(
    @CurrentUser() user: AuthedUser,
    @Body(new ZodValidationPipe(ChatRequest)) body: z.infer<typeof ChatRequest>,
  ): Promise<ChatResponse> {
    return this.svc.chat(user.id, body.messages, body.options, body.provider_keys ?? {});
  }
}
