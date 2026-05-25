import { Module } from '@nestjs/common';
import { ProfilesController } from './profiles.controller.js';
import { PublicProfilesController } from './handle.controller.js';
import { ProfilesService } from './profiles.service.js';

@Module({
  controllers: [ProfilesController, PublicProfilesController],
  providers: [ProfilesService],
})
export class ProfilesModule {}
