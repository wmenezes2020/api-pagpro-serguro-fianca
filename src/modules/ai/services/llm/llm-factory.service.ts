import { Injectable, Logger } from '@nestjs/common';
import { GeminiLLMService } from './gemini-llm.service';
import { OpenAILLMService } from './openai-llm.service';
import { LLMService, LLMCredential } from '../../interfaces/llm.interface';

@Injectable()
export class LLMFactoryService {
  private readonly logger = new Logger(LLMFactoryService.name);

  constructor(
    private readonly geminiService: GeminiLLMService,
    private readonly openaiService: OpenAILLMService,
  ) {}

  /**
   * Retorna o serviço LLM apropriado baseado no tipo especificado na credencial
   */
  getLLMService(credential: LLMCredential): LLMService {
    this.logger.log(
      `🔧 Selecionando serviço LLM: ${credential.llm} para credencial ${credential.name}`,
    );

    switch (credential.llm) {
      case 'gemini':
        return this.geminiService;
      case 'openai':
        return this.openaiService;
      default:
        this.logger.warn(
          `⚠️ LLM não reconhecido: ${credential.llm}. Usando Gemini como fallback.`,
        );
        return this.geminiService;
    }
  }

  /**
   * Gera resposta usando o LLM apropriado baseado na credencial
   */
  async generateResponse(
    prompt: string,
    credential: LLMCredential,
    options?: {
      temperature?: number;
      maxTokens?: number;
      companyId?: string;
    },
  ): Promise<string> {
    const service = this.getLLMService(credential);
    return service.generateResponse(prompt, credential, options);
  }

  /**
   * Testa conexão usando o LLM apropriado baseado na credencial
   */
  async testConnection(credential: LLMCredential): Promise<boolean> {
    const service = this.getLLMService(credential);
    return service.testConnection(credential);
  }

  /**
   * Lista todos os LLMs suportados
   */
  getSupportedLLMs(): string[] {
    return ['gemini', 'openai'];
  }

  /**
   * Valida se um LLM é suportado
   */
  isLLMSupported(llm: string): boolean {
    return this.getSupportedLLMs().includes(llm);
  }
}
