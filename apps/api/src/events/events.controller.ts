import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { EventsService } from './events.service.js';
import { EventsBatchSchema, type EventsBatchInput } from './dto.js';
import { JwtAuthGuard, type AuthedUser, CurrentUser } from '../auth/jwt.guard.js';
import { ZodValidationPipe } from '../common/zod.pipe.js';

@Controller('events')
@UseGuards(JwtAuthGuard)
export class EventsController {
  constructor(private readonly svc: EventsService) {}

  /** Batch engagement event'leri (yüksek frekans → cömert rate-limit). */
  @Post()
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  record(
    @CurrentUser() user: AuthedUser,
    @Body(new ZodValidationPipe(EventsBatchSchema)) body: EventsBatchInput,
  ) {
    return this.svc.record(user.id, body.events);
  }
}
