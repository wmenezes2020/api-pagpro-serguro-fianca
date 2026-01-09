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
export class GeminiLLMService implements LLMService {
  private readonly logger = new Logger(GeminiLLMService.name);
  private readonly baseUrl =
    'https://generativelanguage.googleapis.com/v1beta/models';

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
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: maxTokens,
        },
      };

      const url = `${this.baseUrl}/${credential.model}:generateContent`;

      this.logger.log(
        `🤖 Gemini: Enviando requisição para modelo ${credential.model}`,
      );

      const response = await firstValueFrom(
        this.httpService.post<LLMResponse>(url, request, {
          params: { key: credential.apiKey },
          headers: {
            'Content-Type': 'application/json',
          },
        }),
      );

      const responseData = response.data;
      if (responseData.candidates && responseData.candidates.length > 0) {
        const content = responseData.candidates[0].content.parts[0].text;
        this.logger.log(
          `✅ Gemini: Resposta gerada com sucesso (${content.length} caracteres)`,
        );
        return content;
      }

      throw new Error('Resposta vazia do Gemini');
    } catch (error) {
      this.logger.error(`❌ Erro no Gemini: ${error.message}`);
      throw error;
    }
  }

  async testConnection(credential: LLMCredential): Promise<boolean> {
    try {
      const testRequest: LLMRequest = {
        contents: [
          {
            parts: [
              {
                text: 'Teste de conectividade',
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 10,
        },
      };

      const url = `${this.baseUrl}/${credential.model}:generateContent`;

      const response = await firstValueFrom(
        this.httpService.post<LLMResponse>(url, testRequest, {
          params: { key: credential.apiKey },
          headers: {
            'Content-Type': 'application/json',
          },
        }),
      );

      return (response.status ?? 0) === 200;
    } catch (error) {
      this.logger.error(`❌ Teste de conexão Gemini falhou: ${error.message}`);
      return false;
    }
  }
}
