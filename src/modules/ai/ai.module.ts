import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AIService } from './ai.service';
import { AiCredential } from './entities/ai-credential.entity';
import { IaCredentialsService } from './services/ia-credentials.service';
import { LLMUnifiedService } from './services/llm-unified.service';
import { LLMFactoryService } from './services/llm/llm-factory.service';
import { GeminiLLMService } from './services/llm/gemini-llm.service';
import { OpenAILLMService } from './services/llm/openai-llm.service';

@Module({
  imports: [HttpModule, TypeOrmModule.forFeature([AiCredential])],
  providers: [
    AIService,
    IaCredentialsService,
    LLMUnifiedService,
    LLMFactoryService,
    GeminiLLMService,
    OpenAILLMService,
  ],
  exports: [AIService, LLMUnifiedService, IaCredentialsService],
})
export class AIModule {}
