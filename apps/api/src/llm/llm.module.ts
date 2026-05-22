import { Module } from '@nestjs/common';
import { LLMService } from './llm.service.js';
import { LLMController } from './llm.controller.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [AuthModule],
  controllers: [LLMController],
  providers: [LLMService],
  exports: [LLMService],
})
export class LLMModule {}
