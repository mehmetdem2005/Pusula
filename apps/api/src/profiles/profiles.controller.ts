import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { ProfilesService } from './profiles.service.js';
import { JwtAuthGuard, type AuthedUser, CurrentUser } from '../auth/jwt.guard.js';
import { ZodValidationPipe } from '../common/zod.pipe.js';

const UpdateProfileSchema = z.object({
  handle: z
    .string()
    .trim()
    .regex(/^[a-z0-9_]{3,30}$/, 'Kullanıcı adı: 3-30, küçük harf/rakam/alt çizgi')
    .optional(),
  bio: z.string().max(500).optional(),
  avatar_url: z.string().url().max(1000).optional(),
  is_public: z.boolean().optional(),
});
type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;

@Controller('profiles')
@UseGuards(JwtAuthGuard)
export class ProfilesController {
  constructor(private readonly svc: ProfilesService) {}

  /** Kendi profilini güncelle (statik route — :handle'dan önce). */
  @Patch('me')
  updateMe(
    @CurrentUser() user: AuthedUser,
    @Body(new ZodValidationPipe(UpdateProfileSchema)) body: UpdateProfileInput,
  ) {
    return this.svc.updateMe(user.id, body);
  }

  @Get(':handle')
  byHandle(@Param('handle') handle: string) {
    return this.svc.getByHandle(handle);
  }
}
