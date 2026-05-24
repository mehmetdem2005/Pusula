import { Module } from '@nestjs/common';
import { IlanlarController } from './ilanlar.controller.js';
import { IlanlarService } from './ilanlar.service.js';
import { ScoringModule } from '../scoring/scoring.module.js';
import { LLMModule } from '../llm/llm.module.js';

@Module({
  imports: [ScoringModule, LLMModule],
  controllers: [IlanlarController],
  providers: [IlanlarService],
  exports: [IlanlarService],
})
export class IlanlarModule {}
