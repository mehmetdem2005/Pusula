import { Module } from '@nestjs/common';
import { LLMModule } from '../llm/llm.module.js';

@Module({
  imports: [LLMModule],
})
export class ChatModule {}
