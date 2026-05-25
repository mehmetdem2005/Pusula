import { Controller, Get, Query } from '@nestjs/common';
import { ProfilesService } from './profiles.service.js';

/** Kayıt öncesi kullanıcı adı uygunluğu — public (oturum gerektirmez). */
@Controller('public')
export class PublicProfilesController {
  constructor(private readonly svc: ProfilesService) {}

  @Get('handle-available')
  available(@Query('h') h?: string) {
    return this.svc.isHandleAvailable((h ?? '').trim().toLowerCase());
  }
}
