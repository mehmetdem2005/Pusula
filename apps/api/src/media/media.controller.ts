import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { MediaService } from './media.service.js';
import { CompleteSchema, UploadUrlSchema, type CompleteInput, type UploadUrlInput } from './dto.js';
import { JwtAuthGuard, type AuthedUser, CurrentUser } from '../auth/jwt.guard.js';
import { ZodValidationPipe } from '../common/zod.pipe.js';

@Controller('media')
@UseGuards(JwtAuthGuard)
export class MediaController {
  constructor(private readonly svc: MediaService) {}

  @Post('upload-url')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  uploadUrl(
    @CurrentUser() user: AuthedUser,
    @Body(new ZodValidationPipe(UploadUrlSchema)) body: UploadUrlInput,
  ) {
    return this.svc.createUploadUrl(user.id, body);
  }

  @Post(':id/complete')
  complete(
    @CurrentUser() user: AuthedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(CompleteSchema)) body: CompleteInput,
  ) {
    return this.svc.complete(user.id, id, body);
  }

  @Get(':id/read-url')
  readUrl(@CurrentUser() user: AuthedUser, @Param('id') id: string) {
    return this.svc.readUrl(user.id, id);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthedUser, @Param('id') id: string) {
    return this.svc.remove(user.id, id);
  }
}
