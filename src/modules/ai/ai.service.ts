import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RentalApplication } from '../applications/entities/rental-application.entity';
import { Document } from '../documents/entities/document.entity';
import { ScoringResult } from '../applications/services/rental-applications.service';
import { RiskLevel } from '../../common/enums/risk-level.enum';
import { ApplicationStatus } from '../../common/enums/application-status.enum';
import { LLMUnifiedService } from './services/llm-unified.service';

@Injectable()
export class AIService implements OnModuleInit {
  private readonly logger = new Logger(AIService.name);
  private isConfigured = false;

  constructor(private readonly llmUnifiedService: LLMUnifiedService) {}

  async onModuleInit() {
    try {
      // Verificar se há LLMs disponíveis
      const supportedLLMs = this.llmUnifiedService.getSupportedLLMs();
      if (supportedLLMs.length > 0) {
        this.isConfigured = true;
        this.logger.log(
          `Serviço de IA inicializado com LLMs dinâmicos: ${supportedLLMs.join(', ')}`,
        );
      } else {
        this.logger.warn(
          'Nenhum LLM configurado. Configure credenciais no banco de dados.',
        );
      }
    } catch (error) {
      this.logger.warn(
        'Falha ao inicializar serviço de IA. Análise por IA estará desabilitada.',
      );
      this.logger.debug(error.message);
    }
  }

  private ensureConfigured() {
    if (!this.isConfigured) {
      throw new Error(
        'Serviço de IA não está configurado. Configure credenciais de LLM no banco de dados.',
      );
    }
  }

  async analyzeCreditApplication(
    application: RentalApplication,
    documents: Document[],
    companyId?: string,
  ): Promise<ScoringResult> {
    this.ensureConfigured();

    const systemPrompt = this.getSystemPrompt();
    const userPrompt = this.buildAnalysisPrompt(application, documents);

    // Combinar system e user prompt para LLMs que não suportam system messages
    const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;

    try {
      // Usar LLM dinâmico (preferencialmente Gemini, com fallback para OpenAI)
      const responseContent =
        await this.llmUnifiedService.generateGeminiResponse(
          fullPrompt,
          companyId,
          {
            temperature: 0.3, // Baixa temperatura para análises mais consistentes
            maxTokens: 2000,
          },
        );

      if (!responseContent) {
        throw new Error('Resposta vazia do LLM');
      }

      // Tentar extrair JSON da resposta (pode estar em markdown code blocks)
      let jsonContent = responseContent.trim();

      // Remover markdown code blocks se existirem
      const jsonMatch = jsonContent.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
      if (jsonMatch) {
        jsonContent = jsonMatch[1];
      }

      const analysisResult = JSON.parse(jsonContent);
      return this.parseAIResponse(analysisResult, application);
    } catch (error) {
      this.logger.error('Erro ao analisar aplicação com IA', error.stack);
      throw new Error(
        `Falha na análise por IA: ${error.message}. Retornando análise padrão.`,
      );
    }
  }

  private getSystemPrompt(): string {
    return `Você é um especialista em análise de crédito imobiliário e seguro fiança. Sua função é analisar solicitações de seguro fiança para locação de imóveis e gerar um score de crédito preciso, além de recomendar aprovação ou negação.

REGRAS DE ANÁLISE:
1. Score de 0 a 100, onde:
   - 0-30: Risco ALTO, RECUSAR
   - 31-60: Risco MÉDIO, ANÁLISE MANUAL
   - 61-85: Risco BAIXO, APROVAR
   - 86-100: Risco MUITO BAIXO, APROVAR COM BÔNUS

2. Fatores de análise:
   - Renda vs Aluguel: Renda deve ser pelo menos 3x o valor do aluguel (ideal: 4-5x)
   - Histórico de crédito: Restrições negativas reduzem significativamente o score
   - Estabilidade profissional: Emprego fixo aumenta score
   - Documentação: Documentos completos e legíveis aumentam confiabilidade
   - Idade e experiência: Perfil do solicitante

3. Cálculo de cobertura e taxas:
   - Cobertura máxima: 3x o valor do aluguel mensal
   - Taxa mensal: 15% do valor do aluguel
   - Taxa de adesão: 100% do valor do aluguel (1x)

4. Você DEVE retornar APENAS um JSON válido com a seguinte estrutura:
{
  "score": número de 0 a 100,
  "riskLevel": "LOW" | "MEDIUM" | "HIGH",
  "maximumCoverage": número decimal,
  "monthlyFee": número decimal,
  "adhesionFee": número decimal,
  "indicators": objeto com métricas calculadas,
  "suggestedStatus": "APPROVED" | "REJECTED" | "IN_ANALYSIS",
  "analystNotes": string explicando a decisão
}

Seja objetivo, preciso e baseie suas decisões apenas nos dados fornecidos.`;
  }

  private buildAnalysisPrompt(
    application: RentalApplication,
    documents: Document[],
  ): string {
    const applicant = application.applicant;
    const property = application.property;
    const documentsList = documents
      .map(
        (doc) =>
          `- ${doc.originalFileName} (${doc.mimeType}, ${this.formatFileSize(doc.size)})`,
      )
      .join('\n');

    return `Analise a seguinte solicitação de seguro fiança:

DADOS DO SOLICITANTE:
- Nome: ${(applicant as any).fullName || applicant.email || 'Não informado'}
- Email: ${applicant.email}
- Renda Mensal: R$ ${application.monthlyIncome.toFixed(2)}
- Situação Profissional: ${application.employmentStatus || 'Não informado'}
- Possui Restrições de Crédito: ${application.hasNegativeRecords ? 'SIM' : 'NÃO'}

DADOS DO IMÓVEL:
- Endereço: ${property.address}
- Valor do Aluguel Solicitado: R$ ${application.requestedRentValue.toFixed(2)}
- Título: ${property.title || 'Não informado'}

RÁCIO RENDA/ALUGUEL:
- Renda: R$ ${application.monthlyIncome.toFixed(2)}
- Aluguel: R$ ${application.requestedRentValue.toFixed(2)}
- Múltiplo: ${(application.monthlyIncome / application.requestedRentValue).toFixed(2)}x

DOCUMENTOS ANEXADOS:
${documents.length > 0 ? documentsList : 'Nenhum documento anexado ainda.'}

NÚMERO DA SOLICITAÇÃO: ${application.applicationNumber}
DATA DE CRIAÇÃO: ${application.createdAt.toLocaleDateString('pt-BR')}

INSTRUÇÕES:
1. Calcule um score de 0 a 100 baseado nos fatores de risco
2. Determine o nível de risco (LOW, MEDIUM, HIGH)
3. Calcule a cobertura máxima (3x o aluguel)
4. Calcule a taxa mensal (15% do aluguel)
5. Calcule a taxa de adesão (100% do aluguel)
6. Recomende o status (APPROVED, REJECTED, ou IN_ANALYSIS)
7. Forneça notas analíticas explicando sua decisão

Retorne APENAS o JSON conforme especificado no prompt do sistema.`;
  }

  private parseAIResponse(
    aiResponse: any,
    application: RentalApplication,
  ): ScoringResult {
    // Validação e normalização dos dados retornados pela IA
    const score = Math.max(
      0,
      Math.min(100, Math.round(Number(aiResponse.score) || 50)),
    );

    const riskLevel =
      aiResponse.riskLevel === 'LOW' ||
      aiResponse.riskLevel === 'MEDIUM' ||
      aiResponse.riskLevel === 'HIGH'
        ? (aiResponse.riskLevel as RiskLevel)
        : score >= 75
          ? RiskLevel.LOW
          : score <= 45
            ? RiskLevel.HIGH
            : RiskLevel.MEDIUM;

    const rent = Number(application.requestedRentValue);
    const coverageMultiplier = 3;
    const monthlyPremiumRate = 0.15;
    const adhesionFeeRate = 1;

    const maximumCoverage =
      Number(aiResponse.maximumCoverage) || rent * coverageMultiplier;
    const monthlyFee =
      Number(aiResponse.monthlyFee) || rent * monthlyPremiumRate;
    const adhesionFee =
      Number(aiResponse.adhesionFee) || rent * adhesionFeeRate;

    // Determinar status sugerido baseado no score
    let suggestedStatus: ApplicationStatus;
    if (aiResponse.suggestedStatus) {
      if (
        [
          ApplicationStatus.APPROVED,
          ApplicationStatus.REJECTED,
          ApplicationStatus.IN_ANALYSIS,
        ].includes(aiResponse.suggestedStatus)
      ) {
        suggestedStatus = aiResponse.suggestedStatus;
      } else {
        suggestedStatus =
          score >= 75
            ? ApplicationStatus.APPROVED
            : score <= 45
              ? ApplicationStatus.REJECTED
              : ApplicationStatus.IN_ANALYSIS;
      }
    } else {
      suggestedStatus =
        score >= 75
          ? ApplicationStatus.APPROVED
          : score <= 45
            ? ApplicationStatus.REJECTED
            : ApplicationStatus.IN_ANALYSIS;
    }

    const indicators = {
      ...(aiResponse.indicators || {}),
      income: application.monthlyIncome,
      rent: rent,
      incomeRentRatio: application.monthlyIncome / rent,
      coverageMultiplier,
      monthlyPremiumRate,
      adhesionFeeRate,
      hasNegativeRecords: application.hasNegativeRecords,
      employmentStatus: application.employmentStatus,
      aiGenerated: true,
      aiModel: aiResponse.aiModel || 'dynamic-llm',
      aiNotes: aiResponse.analystNotes || 'Análise gerada por IA',
    };

    return {
      score,
      riskLevel,
      maximumCoverage,
      monthlyFee,
      adhesionFee,
      indicators,
      suggestedStatus,
    };
  }

  private formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  isAIAvailable(): boolean {
    return this.isConfigured;
  }
}
