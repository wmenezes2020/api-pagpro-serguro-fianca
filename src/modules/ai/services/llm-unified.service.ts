import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { IaCredentialsService } from './ia-credentials.service';
import { LLMFactoryService } from './llm/llm-factory.service';
import { LLMCredential } from '../interfaces/llm.interface';

@Injectable()
export class LLMUnifiedService {
  private readonly logger = new Logger(LLMUnifiedService.name);
  private readonly MAX_ATTEMPTS = 5;

  constructor(
    private readonly iaCredentialsService: IaCredentialsService,
    private readonly llmFactoryService: LLMFactoryService,
  ) {}

  /**
   * Gera resposta usando LLM aleatório para análise de documentos
   * Tenta múltiplas credenciais em caso de erro 429 (rate limit)
   */
  async generateResponse(
    prompt: string,
    companyId?: string,
    options?: {
      temperature?: number;
      maxTokens?: number;
    },
  ): Promise<string> {
    const usedCredentialIds = new Set<number>();
    let attempt = 0;
    let lastError: any = null;

    while (attempt < this.MAX_ATTEMPTS) {
      attempt++;
      const excludeIds = Array.from(usedCredentialIds);
      let credential: LLMCredential;

      try {
        credential = await this.iaCredentialsService.getRandomActiveCredential(
          companyId,
          excludeIds,
        );
      } catch (credentialError) {
        this.logger.error(
          `❌ Não foi possível obter credencial na tentativa ${attempt}: ${credentialError.message}`,
        );
        if (usedCredentialIds.size === 0) {
          throw credentialError;
        }
        lastError = credentialError;
        break;
      }

      if (usedCredentialIds.has(credential.id)) {
        this.logger.warn(
          `⚠️ Nenhuma outra credencial disponível após ${usedCredentialIds.size} tentativa(s).`,
        );
        break;
      }

      usedCredentialIds.add(credential.id);

      this.logger.log(
        `🤖 Análise de documentos usando LLM: ${credential.llm} com modelo: ${credential.model} (tentativa ${attempt}/${this.MAX_ATTEMPTS})`,
      );

      try {
        const response = await this.llmFactoryService.generateResponse(
          prompt,
          credential,
          options,
        );

        await this.iaCredentialsService.updateCredentialUsage(credential.id);

        return response;
      } catch (error) {
        lastError = error;
        if (this.is429Error(error)) {
          this.logger.warn(
            `⚠️ Credencial ${credential.llm} ${credential.id} retornou 429 (limite atingido). Tentando nova chave...`,
          );
          continue;
        }

        this.logger.error(`❌ Erro ao gerar resposta: ${error.message}`);
        throw error;
      }
    }

    const attempts = usedCredentialIds.size || attempt || 1;
    const errorMessage =
      attempts > 1
        ? 'Todas as credenciais atingiram o limite (429). Aguarde alguns minutos e tente novamente.'
        : 'Não há credenciais disponíveis para completar esta operação.';

    this.logger.error(`❌ ${errorMessage}`);
    if (lastError) {
      this.logger.error(`Último erro registrado: ${lastError.message}`);
    }

    throw new HttpException(errorMessage, HttpStatus.TOO_MANY_REQUESTS);
  }

  /**
   * Gera resposta usando especificamente Gemini (para análise de documentos)
   */
  async generateGeminiResponse(
    prompt: string,
    companyId?: string,
    options?: {
      temperature?: number;
      maxTokens?: number;
    },
  ): Promise<string> {
    const usedCredentialIds = new Set<number>();
    let attempt = 0;
    let lastError: any = null;

    while (attempt < this.MAX_ATTEMPTS) {
      attempt++;
      const excludeIds = Array.from(usedCredentialIds);
      let credential: LLMCredential;

      try {
        credential = await this.iaCredentialsService.getRandomGeminiCredential(
          companyId,
          excludeIds,
        );
      } catch (credentialError) {
        this.logger.error(
          `❌ Não foi possível obter credencial Gemini na tentativa ${attempt}: ${credentialError.message}`,
        );
        if (usedCredentialIds.size === 0) {
          throw credentialError;
        }
        lastError = credentialError;
        break;
      }

      if (usedCredentialIds.has(credential.id)) {
        this.logger.warn(
          `⚠️ Nenhuma outra credencial Gemini disponível após ${usedCredentialIds.size} tentativa(s).`,
        );
        break;
      }

      usedCredentialIds.add(credential.id);

      this.logger.log(
        `🤖 Análise usando Gemini: ${credential.model} (tentativa ${attempt}/${this.MAX_ATTEMPTS})`,
      );

      try {
        const response = await this.llmFactoryService.generateResponse(
          prompt,
          credential,
          options,
        );

        await this.iaCredentialsService.updateCredentialUsage(credential.id);

        return response;
      } catch (error) {
        lastError = error;
        if (this.is429Error(error)) {
          this.logger.warn(
            `⚠️ Credencial Gemini ${credential.id} retornou 429 (limite atingido). Tentando nova chave...`,
          );
          continue;
        }

        this.logger.error(`❌ Erro ao gerar resposta Gemini: ${error.message}`);
        throw error;
      }
    }

    // Fallback para OpenAI se todas as credenciais Gemini falharem
    if (
      usedCredentialIds.size >= this.MAX_ATTEMPTS &&
      this.is429Error(lastError)
    ) {
      this.logger.warn(
        '⚠️ Todas as credenciais Gemini retornaram 429. Aplicando fallback automático para OpenAI...',
      );
      try {
        const openAiCredential =
          await this.iaCredentialsService.getRandomOpenAICredential(companyId);
        this.logger.log(
          `🤖 Fallback OpenAI selecionado: ${openAiCredential.model} (${openAiCredential.llm})`,
        );
        const response = await this.llmFactoryService.generateResponse(
          prompt,
          openAiCredential,
          options,
        );
        await this.iaCredentialsService.updateCredentialUsage(
          openAiCredential.id,
        );
        return response;
      } catch (fallbackError) {
        this.logger.error(
          `❌ Fallback OpenAI falhou: ${fallbackError.message}`,
        );
        lastError = fallbackError;
      }
    }

    const attempts = usedCredentialIds.size || attempt || 1;
    const errorMessage =
      attempts > 1
        ? 'Todas as credenciais Gemini atingiram o limite (429). Aguarde alguns minutos e tente novamente.'
        : 'Não há credenciais Gemini disponíveis para completar esta operação.';

    this.logger.error(`❌ ${errorMessage}`);
    if (lastError) {
      this.logger.error(`Último erro registrado: ${lastError.message}`);
    }

    throw new HttpException(errorMessage, HttpStatus.TOO_MANY_REQUESTS);
  }

  /**
   * Lista todos os LLMs suportados
   */
  getSupportedLLMs(): string[] {
    return this.llmFactoryService.getSupportedLLMs();
  }

  /**
   * Valida se um LLM é suportado
   */
  isLLMSupported(llm: string): boolean {
    return this.llmFactoryService.isLLMSupported(llm);
  }

  private is429Error(error: any): boolean {
    if (!error) {
      return false;
    }
    const statusCode = error?.response?.status ?? error?.status;
    if (statusCode === 429) {
      return true;
    }
    const message = typeof error?.message === 'string' ? error.message : '';
    return message.includes('429');
  }
}
