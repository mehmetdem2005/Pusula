import { Body, Controller, HttpCode, Logger, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { z } from 'zod';
import { JwtAuthGuard, type AuthedUser, CurrentUser } from '../auth/jwt.guard.js';
import { ZodValidationPipe } from '../common/zod.pipe.js';

const ParserErrorSchema = z.object({
  url: z.string().url().max(500),
  parser: z.string().max(100),
  error: z.string().max(2000).optional(),
  user_agent: z.string().max(500).optional(),
});

@Controller('telemetry')
@UseGuards(JwtAuthGuard)
export class TelemetryController {
  private readonly logger = new Logger(TelemetryController.name);

  /**
   * Extension parse hatalarını topla. Sentry'ye veya Postgres'e yazılabilir.
   * MVP: sadece structured log; Sentry custom event V1.
   */
  @Post('parser-error')
  @HttpCode(202)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  async parserError(
    @CurrentUser() user: AuthedUser,
    @Body(new ZodValidationPipe(ParserErrorSchema)) body: z.infer<typeof ParserErrorSchema>,
  ): Promise<{ ok: true }> {
    this.logger.warn('Parser error', {
      user_id: user.id,
      parser: body.parser,
      url: body.url,
      error: body.error,
    });
    return { ok: true };
  }
}
