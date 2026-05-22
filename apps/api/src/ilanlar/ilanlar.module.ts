import { Module } from '@nestjs/common';
import { IlanlarController } from './ilanlar.controller.js';
import { IlanlarService } from './ilanlar.service.js';
import { ComparablesRepository } from './comparables.repository.js';
import { ScoringModule } from '../scoring/scoring.module.js';

@Module({
  imports: [ScoringModule],
  controllers: [IlanlarController],
  providers: [IlanlarService, ComparablesRepository],
  exports: [IlanlarService, ComparablesRepository],
})
export class IlanlarModule {}
