import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { VideosService } from './videos.service.js';
import { CreateVideoSchema, type CreateVideoInput } from './dto.js';
import { JwtAuthGuard, type AuthedUser, CurrentUser } from '../auth/jwt.guard.js';
import { ZodValidationPipe } from '../common/zod.pipe.js';

@Controller('videos')
@UseGuards(JwtAuthGuard)
export class VideosController {
  constructor(private readonly svc: VideosService) {}

  /** AI video üretim işi başlat (sahip + günlük kapak). */
  @Post()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  create(
    @CurrentUser() user: AuthedUser,
    @Body(new ZodValidationPipe(CreateVideoSchema)) body: CreateVideoInput,
  ): Promise<{ id: string; status: string }> {
    return this.svc.createJob(user.id, body);
  }

  /** İlana ait video işleri (editör poll'u). */
  @Get()
  list(
    @CurrentUser() user: AuthedUser,
    @Query('listing_id') listingId: string,
  ): Promise<unknown[]> {
    return this.svc.listForListing(user.id, listingId);
  }

  /** Tek işin durumu (poll). */
  @Get(':id')
  get(@CurrentUser() user: AuthedUser, @Param('id') id: string): Promise<unknown> {
    return this.svc.getJob(user.id, id);
  }
}
