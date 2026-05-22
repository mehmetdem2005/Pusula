import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { KonutInput } from '@pusula/shared';
import { IlanlarService } from './ilanlar.service.js';
import { ListBatchSchema, type ListBatchInput } from './dto.js';
import { JwtAuthGuard, type AuthedUser, CurrentUser } from '../auth/jwt.guard.js';
import { ZodValidationPipe } from '../common/zod.pipe.js';

@Controller('ilanlar')
@UseGuards(JwtAuthGuard)
export class IlanlarController {
  constructor(private readonly service: IlanlarService) {}

  /**
   * Extension'dan tek bir konut ilanı ingest et + skor hesapla.
   * Idempotent: aynı (kaynak, kaynak_id) tekrar gelirse mevcut kaydı döner.
   */
  @Post('ingest')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async ingest(
    @CurrentUser() user: AuthedUser,
    @Body(new ZodValidationPipe(KonutInput)) input: KonutInput,
  ): Promise<{ id: string; score_id: string }> {
    return this.service.ingestKonut(user.id, input);
  }

  /**
   * Liste sayfasından batch — passive collector çıktısı.
   * Sıkı validation, boyut limiti, sadece sahibinden URL.
   */
  @Post('list-batch')
  @HttpCode(202)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async listBatch(
    @CurrentUser() user: AuthedUser,
    @Body(new ZodValidationPipe(ListBatchSchema)) body: ListBatchInput,
  ): Promise<{ accepted: number }> {
    return this.service.acceptListBatch(user.id, body.items);
  }
}
