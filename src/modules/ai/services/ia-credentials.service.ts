import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AiCredential,
  CredentialStatus,
} from '../entities/ai-credential.entity';
import { LLMFactoryService } from './llm/llm-factory.service';

@Injectable()
export class IaCredentialsService {
  private readonly logger = new Logger(IaCredentialsService.name);

  constructor(
    @InjectRepository(AiCredential)
    private readonly aiCredentialRepository: Repository<AiCredential>,
  ) {}

  /**
   * Busca uma credencial de IA ativa aleatória no banco de dados.
   * Adiciona a seleção explícita do campo `apiKey` que por padrão não é selecionado.
   * @param companyId Opcional. Se fornecido, busca uma credencial específica da empresa ou uma global (companyId IS NULL).
   * @param excludeIds Opcional. Array de IDs de credenciais a serem excluídos da busca.
   * @returns Uma promessa que resolve para uma instância de AiCredential.
   */
  async getRandomActiveCredential(
    companyId?: string,
    excludeIds: number[] = [],
  ): Promise<AiCredential> {
    const queryBuilder = this.aiCredentialRepository
      .createQueryBuilder('credential')
      .addSelect('credential.apiKey')
      .addSelect('credential.llm')
      .where('credential.isActive = :isActive', { isActive: true });

    if (companyId) {
      // Se companyId fornecido: buscar credenciais da empresa OU globais
      queryBuilder.andWhere(
        '(credential.companyId = :companyId OR credential.companyId IS NULL)',
        { companyId },
      );
    } else {
      // Se companyId não fornecido: buscar apenas credenciais globais
      queryBuilder.andWhere('credential.companyId IS NULL');
    }

    if (excludeIds.length > 0) {
      queryBuilder.andWhere('credential.id NOT IN (:...excludeIds)', {
        excludeIds,
      });
    }

    const count = await queryBuilder.getCount();

    if (count === 0) {
      if (excludeIds.length > 0) {
        // Se não encontrou nenhuma credencial para excluir, tenta buscar qualquer uma
        return this.getRandomActiveCredential(companyId);
      }

      if (companyId) {
        this.logger.error(
          `Nenhuma credencial de IA ativa encontrada para companyId: ${companyId}`,
        );
        throw new NotFoundException(
          `Nenhuma credencial de IA ativa encontrada para a empresa ${companyId}.`,
        );
      } else {
        this.logger.error(
          'Nenhuma credencial de IA global (company_id = null) ativa encontrada no banco de dados.',
        );
        throw new NotFoundException(
          'Nenhuma credencial de IA global encontrada. É necessário cadastrar credenciais globais (sem company_id) para análise de documentos.',
        );
      }
    }

    const randomIndex = Math.floor(Math.random() * count);
    const credential = await queryBuilder.offset(randomIndex).limit(1).getOne();

    if (!credential) {
      this.logger.warn(
        'Não foi possível buscar uma credencial aleatória, tentando novamente sem exclusão.',
      );
      // Fallback para o caso de alguma condição de corrida (race condition)
      return this.getRandomActiveCredential(companyId);
    }

    // Log para debug
    this.logger.log(
      `✅ Credencial encontrada: ID=${credential.id}, nome=${credential.name}, apiKey presente: ${!!credential.apiKey}, model: ${credential.model}, llm: ${credential.llm}`,
    );

    if (!credential.apiKey) {
      this.logger.error(
        `⚠️ ERRO: Credencial ${credential.id} (${credential.name}) encontrada mas apiKey está undefined!`,
      );
      throw new Error(
        `Credencial ${credential.name} não possui apiKey configurada`,
      );
    }

    return credential;
  }

  /**
   * 🔧 Busca credencial Gemini específica para análise de documentos
   * Ignora status e isActive, considera apenas llm = 'gemini'
   * @param companyId Opcional. Se fornecido, busca uma credencial específica da empresa ou uma global (companyId IS NULL).
   * @param excludeIds Opcional. Array de IDs de credenciais a serem excluídos da busca.
   * @returns Uma promessa que resolve para uma instância de AiCredential Gemini.
   */
  async getRandomGeminiCredential(
    companyId?: string,
    excludeIds: number[] = [],
  ): Promise<AiCredential> {
    const queryBuilder = this.aiCredentialRepository
      .createQueryBuilder('credential')
      .addSelect('credential.apiKey')
      .addSelect('credential.llm')
      .where('credential.llm = :llm', { llm: 'gemini' }); // ✅ APENAS GEMINI

    if (companyId) {
      // Se companyId fornecido: buscar credenciais da empresa OU globais
      queryBuilder.andWhere(
        '(credential.companyId = :companyId OR credential.companyId IS NULL)',
        { companyId },
      );
    } else {
      // Se companyId não fornecido: buscar apenas credenciais globais
      queryBuilder.andWhere('credential.companyId IS NULL');
    }

    if (excludeIds.length > 0) {
      queryBuilder.andWhere('credential.id NOT IN (:...excludeIds)', {
        excludeIds,
      });
    }

    const count = await queryBuilder.getCount();

    if (count === 0) {
      if (excludeIds.length > 0) {
        // Se não encontrou nenhuma credencial para excluir, tenta buscar qualquer uma
        return this.getRandomGeminiCredential(companyId);
      }
      throw new NotFoundException('Nenhuma credencial Gemini encontrada');
    }

    const randomIndex = Math.floor(Math.random() * count);
    const credential = await queryBuilder.skip(randomIndex).take(1).getOne();

    if (!credential) {
      throw new NotFoundException('Credencial Gemini não encontrada');
    }

    this.logger.log(
      `✅ Credencial Gemini encontrada: ID=${credential.id}, nome=${credential.name}, apiKey presente: ${!!credential.apiKey}, model: ${credential.model}, llm: ${credential.llm}`,
    );
    return credential;
  }

  async getRandomOpenAICredential(
    companyId?: string,
    excludeIds: number[] = [],
  ): Promise<AiCredential> {
    const queryBuilder = this.aiCredentialRepository
      .createQueryBuilder('credential')
      .addSelect('credential.apiKey')
      .addSelect('credential.llm')
      .where('credential.llm = :llm', { llm: 'openai' })
      .andWhere('credential.isActive = :isActive', { isActive: true });

    if (companyId) {
      queryBuilder.andWhere(
        '(credential.companyId = :companyId OR credential.companyId IS NULL)',
        { companyId },
      );
    } else {
      queryBuilder.andWhere('credential.companyId IS NULL');
    }

    if (excludeIds.length) {
      queryBuilder.andWhere('credential.id NOT IN (:...excludeIds)', {
        excludeIds,
      });
    }

    const count = await queryBuilder.getCount();

    if (count === 0) {
      if (excludeIds.length > 0) {
        return this.getRandomOpenAICredential(companyId);
      }
      throw new NotFoundException(
        'Nenhuma credencial OpenAI ativa encontrada.',
      );
    }

    const randomIndex = Math.floor(Math.random() * count);
    const credential = await queryBuilder.skip(randomIndex).take(1).getOne();

    if (!credential) {
      throw new NotFoundException('Credencial OpenAI não encontrada.');
    }

    this.logger.log(
      `✅ Credencial OpenAI encontrada: ID=${credential.id}, nome=${credential.name}, model=${credential.model}`,
    );
    return credential;
  }

  /**
   * Testa uma credencial fazendo uma requisição simples
   * Agora suporta múltiplos LLMs
   */
  async testCredential(
    id: number,
    llmFactoryService?: LLMFactoryService,
  ): Promise<boolean> {
    const credential = await this.aiCredentialRepository.findOne({
      where: { id },
      select: ['id', 'name', 'model', 'apiKey', 'llm', 'status'],
    });

    if (!credential) {
      return false;
    }

    try {
      // Se temos o factory service, usar o novo sistema
      if (llmFactoryService) {
        const result = await llmFactoryService.testConnection(credential);
        if (result) {
          await this.updateCredentialStatus(id, CredentialStatus.ACTIVE);
        } else {
          await this.updateCredentialStatus(id, CredentialStatus.INACTIVE);
        }
        return result;
      }

      // Fallback para teste manual (apenas Gemini)
      if (credential.llm === 'gemini') {
        const testUrl = `https://generativelanguage.googleapis.com/v1beta/models/${credential.model}:generateContent`;
        const testRequest = {
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

        const response = await fetch(`${testUrl}?key=${credential.apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(testRequest),
        });

        if (response.ok) {
          await this.updateCredentialStatus(id, CredentialStatus.ACTIVE);
          return true;
        } else {
          await this.updateCredentialStatus(id, CredentialStatus.INACTIVE);
          return false;
        }
      } else {
        this.logger.warn(
          `⚠️ Teste manual não suportado para LLM: ${credential.llm}. Use o LLMFactoryService.`,
        );
        return false;
      }
    } catch (error) {
      this.logger.error(`Erro ao testar credencial ${credential.name}:`, error);
      await this.updateCredentialStatus(id, CredentialStatus.INACTIVE);
      return false;
    }
  }

  /**
   * Atualiza o status de uma credencial
   */
  async updateCredentialStatus(
    id: number,
    status: CredentialStatus,
  ): Promise<AiCredential> {
    await this.aiCredentialRepository.update(id, { status });
    const credential = await this.aiCredentialRepository.findOne({
      where: { id },
    });
    if (!credential) {
      throw new NotFoundException(`Credencial com ID ${id} não encontrada`);
    }
    return credential;
  }

  /**
   * Atualiza estatísticas de uso da credencial
   */
  async updateCredentialUsage(id: number): Promise<void> {
    try {
      await this.aiCredentialRepository.increment({ id }, 'usageCount', 1);
      await this.aiCredentialRepository.update(id, { lastUsed: new Date() });
    } catch (error) {
      this.logger.warn(
        `⚠️ Erro ao atualizar estatísticas da credencial ${id}: ${error.message}`,
      );
    }
  }
}
