import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { FeedService } from './feed.service.js';
import { JwtAuthGuard, type AuthedUser, CurrentUser } from '../auth/jwt.guard.js';

@Controller('feed')
@UseGuards(JwtAuthGuard)
export class FeedController {
  constructor(private readonly svc: FeedService) {}

  @Get()
  feed(
    @CurrentUser() user: AuthedUser,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    const c = Number(cursor);
    const l = Number(limit);
    return this.svc.getFeed(
      user.id,
      Number.isFinite(c) ? c : 0,
      Number.isFinite(l) && l > 0 && l <= 20 ? l : 8,
    );
  }
}
