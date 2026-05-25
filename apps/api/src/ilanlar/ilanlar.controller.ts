import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { KonutInput } from '@pusula/shared';
import { IlanlarService } from './ilanlar.service.js';
import {
  CreateListingSchema,
  ExtractSchema,
  PublishSchema,
  UpdateListingSchema,
  type CreateListingInput,
  type ExtractInput,
  type UpdateListingInput,
} from './dto.js';
import { JwtAuthGuard, type AuthedUser, CurrentUser } from '../auth/jwt.guard.js';
import { ZodValidationPipe } from '../common/zod.pipe.js';

@Controller('ilanlar')
@UseGuards(JwtAuthGuard)
export class IlanlarController {
  constructor(private readonly service: IlanlarService) {}

  /** Kullanıcının ilanları + son skorları (dashboard). */
  @Get()
  async list(@CurrentUser() user: AuthedUser): Promise<unknown[]> {
    return this.service.listIlanlar(user.id);
  }

  /** Tek ilan + son skor detayı. */
  @Get(':id')
  async getOne(@CurrentUser() user: AuthedUser, @Param('id') id: string): Promise<unknown> {
    return this.service.getIlan(user.id, id);
  }

  /** UGC: taslak ilan oluştur. */
  @Post()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async create(
    @CurrentUser() user: AuthedUser,
    @Body(new ZodValidationPipe(CreateListingSchema)) body: CreateListingInput,
  ): Promise<{ id: string }> {
    return this.service.createListing(user.id, body);
  }

  /** UGC: ilanı güncelle (sahip). */
  @Patch(':id')
  async update(
    @CurrentUser() user: AuthedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateListingSchema)) body: UpdateListingInput,
  ): Promise<{ ok: true }> {
    return this.service.updateListing(user.id, id, body);
  }

  /** UGC: yayınla (en az 1 hazır medya + ToS beyanı). */
  @Post(':id/publish')
  async publish(
    @CurrentUser() user: AuthedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(PublishSchema)) _body: { tos_attested: true },
  ): Promise<{ ok: true }> {
    return this.service.publishListing(user.id, id);
  }

  /** UGC: yayından kaldır (paused). */
  @Post(':id/unpublish')
  async unpublish(@CurrentUser() user: AuthedUser, @Param('id') id: string): Promise<{ ok: true }> {
    return this.service.unpublishListing(user.id, id);
  }

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
   * Serbest metin / URL → LLM ile alanları çıkar → skorla.
   * Eklenti (sayfa metni) veya "İlan Yapıştır" formundan gelir; sunucu siteye istek atmaz.
   */
  @Post('extract')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async extract(
    @CurrentUser() user: AuthedUser,
    @Body(new ZodValidationPipe(ExtractSchema)) body: ExtractInput,
  ): Promise<{ id: string; score_id: string }> {
    return this.service.extractAndIngest(user.id, body);
  }
}
