import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { z } from 'zod';
import { ReportsService } from './reports.service.js';
import { JwtAuthGuard, type AuthedUser, CurrentUser } from '../auth/jwt.guard.js';
import { ZodValidationPipe } from '../common/zod.pipe.js';

const CreateReportSchema = z.object({
  listing_id: z.string().uuid(),
  media_id: z.string().uuid().optional(),
  reason: z.enum(['spam', 'fraud', 'copyright', 'illegal', 'personal_data', 'other']),
  detail: z.string().max(2000).optional(),
});
type CreateReportInput = z.infer<typeof CreateReportSchema>;

const ResolveReportSchema = z.object({
  status: z.enum(['reviewing', 'actioned', 'dismissed']),
  resolver_note: z.string().max(2000).optional(),
});
type ResolveReportInput = z.infer<typeof ResolveReportSchema>;

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly svc: ReportsService) {}

  @Post()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  create(
    @CurrentUser() user: AuthedUser,
    @Body(new ZodValidationPipe(CreateReportSchema)) body: CreateReportInput,
  ) {
    return this.svc.create(user.id, body);
  }

  /** Admin: açık raporlar. */
  @Get()
  list(@CurrentUser() user: AuthedUser) {
    return this.svc.listForAdmin(user.id);
  }

  /** Admin: raporu çöz. */
  @Patch(':id')
  resolve(
    @CurrentUser() user: AuthedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(ResolveReportSchema)) body: ResolveReportInput,
  ) {
    return this.svc.resolve(user.id, id, body);
  }
}
