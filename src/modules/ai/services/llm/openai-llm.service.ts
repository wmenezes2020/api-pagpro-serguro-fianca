import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
  LLMService,
  LLMCredential,
  LLMRequest,
  LLMResponse,
} from '../../interfaces/llm.interface';

@Injectable()
export class OpenAILLMService implements LLMService {
  private readonly logger = new Logger(OpenAILLMService.name);
  private readonly baseUrl = 'https://api.openai.com/v1/chat/completions';

  constructor(private readonly httpService: HttpService) {}

  async generateResponse(
    prompt: string,
    credential: LLMCredential,
    options: {
      temperature?: number;
      maxTokens?: number;
      companyId?: string;
    } = {},
  ): Promise<string> {
    try {
      const { temperature = 0.3, maxTokens = 2000 } = options;

      const request: LLMRequest = {
        messages: [
          {
            role: 'system',
            content:
              'Você é um especialista em análise de crédito imobiliário e seguro fiança. Seja objetivo, preciso e baseie suas decisões apenas nos dados fornecidos.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: maxTokens,
        temperature: temperature,
        model: credential.model,
      };

      this.logger.log(
        `🤖 OpenAI: Enviando requisição para modelo ${credential.model}`,
      );

      const response = await firstValueFrom(
        this.httpService.post<LLMResponse>(this.baseUrl, request, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${credential.apiKey}`,
          },
        }),
      );

      const responseData = response.data;
      if (responseData.choices && responseData.choices.length > 0) {
        const content = responseData.choices[0].message.content;
        this.logger.log(
          `✅ OpenAI: Resposta gerada com sucesso (${content.length} caracteres)`,
        );
        return content;
      }

      throw new Error('Resposta vazia do OpenAI');
    } catch (error) {
      this.logger.error(`❌ Erro no OpenAI: ${error.message}`);
      throw error;
    }
  }

  async testConnection(credential: LLMCredential): Promise<boolean> {
    try {
      const testRequest: LLMRequest = {
        messages: [
          {
            role: 'user',
            content: 'Teste de conectividade',
          },
        ],
        max_tokens: 10,
        temperature: 0.1,
        model: credential.model,
      };

      const response = await firstValueFrom(
        this.httpService.post<LLMResponse>(this.baseUrl, testRequest, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${credential.apiKey}`,
          },
        }),
      );

      return (response.status ?? 0) === 200;
    } catch (error) {
      this.logger.error(`❌ Teste de conexão OpenAI falhou: ${error.message}`);
      return false;
    }
  }
}
