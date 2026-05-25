import { Module } from '@nestjs/common';
import { EventsController } from './events.controller.js';
import { EventsService } from './events.service.js';
import { ListsModule } from '../lists/lists.module.js';

@Module({
  imports: [ListsModule],
  controllers: [EventsController],
  providers: [EventsService],
})
export class EventsModule {}
