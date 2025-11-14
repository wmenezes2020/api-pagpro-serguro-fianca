import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RentalApplication } from '../entities/rental-application.entity';
import { Property } from '../entities/property.entity';
import { CreateRentalApplicationDto } from '../dto/create-rental-application.dto';
import { User } from '../../users/entities/user.entity';
import { UserRole } from '../../../common/enums/user-role.enum';
import { UsersService } from '../../users/users.service';
import { CreditAnalysis } from '../entities/credit-analysis.entity';
import { ConfigService } from '@nestjs/config';
import { RiskLevel } from '../../../common/enums/risk-level.enum';
import { ApplicationStatus } from '../../../common/enums/application-status.enum';
import { InsurancePolicy } from '../entities/insurance-policy.entity';
import { PolicyStatus } from '../../../common/enums/policy-status.enum';
import { PaymentSchedule } from '../entities/payment-schedule.entity';
import { UpdateApplicationStatusDto } from '../dto/update-application-status.dto';
import { UpdatePaymentStatusDto } from '../dto/update-payment-status.dto';
import { PaymentStatus } from '../../../common/enums/payment-status.enum';
import { AIService } from '../../ai/ai.service';
import { DocumentsService } from '../../documents/documents.service';

export interface ScoringResult {
  score: number;
  riskLevel: RiskLevel;
  maximumCoverage: number;
  monthlyFee: number;
  adhesionFee: number;
  indicators: Record<string, unknown>;
  suggestedStatus: ApplicationStatus;
}

@Injectable()
export class RentalApplicationsService {
  constructor(
    @InjectRepository(RentalApplication)
    private readonly applicationsRepository: Repository<RentalApplication>,
    @InjectRepository(Property)
    private readonly propertyRepository: Repository<Property>,
    @InjectRepository(CreditAnalysis)
    private readonly creditAnalysisRepository: Repository<CreditAnalysis>,
    @InjectRepository(InsurancePolicy)
    private readonly policyRepository: Repository<InsurancePolicy>,
    @InjectRepository(PaymentSchedule)
    private readonly paymentRepository: Repository<PaymentSchedule>,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
    private readonly aiService: AIService,
    private readonly documentsService: DocumentsService,
  ) {}

  async createApplication(
    user: User,
    dto: CreateRentalApplicationDto,
  ): Promise<RentalApplication> {
    const property = await this.propertyRepository.findOne({
      where: { id: dto.propertyId },
      relations: ['owner'],
    });
    if (!property) {
      throw new NotFoundException('Imóvel informado não foi encontrado.');
    }

    const applicant = await this.resolveApplicant(user, dto);
    const broker = await this.resolveBroker(user, dto);

    const application = this.applicationsRepository.create({
      applicationNumber: this.generateApplicationNumber(),
      property,
      applicant,
      broker,
      requestedRentValue: Number(property.rentValue),
      monthlyIncome: dto.monthlyIncome,
      hasNegativeRecords: dto.hasNegativeRecords,
      employmentStatus: dto.employmentStatus,
      documents: dto.documents,
      notes: dto.notes,
      status: ApplicationStatus.SUBMITTED,
    });

    const saved = await this.applicationsRepository.save(application);
    return this.evaluateApplication(saved.id);
  }

  async findAllForUser(user: User): Promise<RentalApplication[]> {
    if (user.role === UserRole.ADMIN) {
      return this.applicationsRepository.find({
        order: { createdAt: 'DESC' },
      });
    }

    if (user.role === UserRole.IMOBILIARIA) {
      const properties = await this.propertyRepository.find({
        where: { owner: { id: user.id } },
      });
      const propertyIds = properties.map((property) => property.id);
      if (propertyIds.length === 0) {
        return [];
      }
      return this.applicationsRepository
        .createQueryBuilder('application')
        .leftJoinAndSelect('application.property', 'property')
        .leftJoinAndSelect('application.applicant', 'applicant')
        .leftJoinAndSelect('application.broker', 'broker')
        .leftJoinAndSelect('application.creditAnalysis', 'creditAnalysis')
        .leftJoinAndSelect('application.insurancePolicy', 'insurancePolicy')
        .where('application.propertyId IN (:...propertyIds)', { propertyIds })
        .orderBy('application.createdAt', 'DESC')
        .getMany();
    }

    if (user.role === UserRole.INQUILINO) {
      return this.applicationsRepository.find({
        where: { applicant: { id: user.id } },
        order: { createdAt: 'DESC' },
      });
    }

    if (user.role === UserRole.CORRETOR) {
      return this.applicationsRepository.find({
        where: { broker: { id: user.id } },
        order: { createdAt: 'DESC' },
      });
    }

    return [];
  }

  async findOneForUser(id: string, user: User): Promise<RentalApplication> {
    const application = await this.applicationsRepository.findOne({
      where: { id },
      relations: [
        'property',
        'property.owner',
        'applicant',
        'broker',
        'creditAnalysis',
        'insurancePolicy',
      ],
    });
    if (!application) {
      throw new NotFoundException('Solicitação não encontrada.');
    }

    if (user.role === UserRole.ADMIN) {
      return application;
    }

    if (
      user.role === UserRole.IMOBILIARIA &&
      application.property.owner.id === user.id
    ) {
      return application;
    }

    if (
      user.role === UserRole.INQUILINO &&
      application.applicant.id === user.id
    ) {
      return application;
    }

    if (user.role === UserRole.CORRETOR && application.broker?.id === user.id) {
      return application;
    }

    throw new ForbiddenException('Você não tem acesso a esta solicitação.');
  }

  async updateStatus(
    id: string,
    dto: UpdateApplicationStatusDto,
    user: User,
  ): Promise<RentalApplication> {
    const application = await this.findOneForUser(id, user);

    if (
      ![UserRole.ADMIN, UserRole.IMOBILIARIA].includes(user.role) ||
      (user.role === UserRole.IMOBILIARIA &&
        application.property.owner.id !== user.id)
    ) {
      throw new ForbiddenException(
        'Você não pode alterar o status desta solicitação.',
      );
    }

    application.status = dto.status;
    application.notes = dto.notes ?? application.notes;

    const updated = await this.applicationsRepository.save(application);

    if (
      dto.status === ApplicationStatus.APPROVED &&
      !application.insurancePolicy
    ) {
      await this.createPolicyForApplication(updated.id);
      return this.findOneForUser(id, user);
    }

    return updated;
  }

  async updatePaymentStatus(dto: UpdatePaymentStatusDto, user: User) {
    const payment = await this.paymentRepository.findOne({
      where: { id: dto.paymentId },
      relations: [
        'policy',
        'policy.application',
        'policy.application.property',
        'policy.application.property.owner',
      ],
    });

    if (!payment) {
      throw new NotFoundException('Parcela não encontrada.');
    }

    if (
      user.role !== UserRole.ADMIN &&
      payment.policy.application.property.owner.id !== user.id
    ) {
      throw new ForbiddenException('Você não pode atualizar esta parcela.');
    }

    payment.status = dto.status;
    payment.paymentReference = dto.paymentReference;
    payment.notes = dto.notes;
    payment.paidAt = dto.status === PaymentStatus.PAID ? new Date() : undefined;

    await this.paymentRepository.save(payment);
    return payment;
  }

  async getDashboardMetrics(user: User) {
    const query = this.applicationsRepository
      .createQueryBuilder('application')
      .leftJoinAndSelect('application.property', 'property')
      .leftJoinAndSelect('application.applicant', 'applicant')
      .leftJoinAndSelect('application.creditAnalysis', 'creditAnalysis')
      .leftJoinAndSelect('application.insurancePolicy', 'insurancePolicy')
      .leftJoinAndSelect('insurancePolicy.paymentSchedule', 'paymentSchedule');

    if (user.role === UserRole.IMOBILIARIA) {
      query.where('property.ownerId = :ownerId', { ownerId: user.id });
    } else if (user.role === UserRole.INQUILINO) {
      query.where('application.applicantId = :tenantId', { tenantId: user.id });
    } else if (user.role === UserRole.CORRETOR) {
      query.where('application.brokerId = :brokerId', { brokerId: user.id });
    }

    const applications = await query
      .orderBy('application.createdAt', 'DESC')
      .getMany();

    const approvals = applications.filter(
      (app) => app.status === ApplicationStatus.APPROVED,
    ).length;
    const uniqueApplicants = new Set(
      applications.map((app) => app.applicant.id),
    ).size;

    const allPayments = applications
      .flatMap((app) => app.insurancePolicy?.paymentSchedule ?? [])
      .filter(Boolean);

    const overdueCount = allPayments.filter(
      (payment) => payment.status === PaymentStatus.OVERDUE,
    ).length;
    const paidCount = allPayments.filter(
      (payment) => payment.status === PaymentStatus.PAID,
    ).length;
    const totalPayments = overdueCount + paidCount;
    const defaultRate = totalPayments > 0 ? overdueCount / totalPayments : 0;

    const scores = applications
      .map((app) => app.creditAnalysis?.score)
      .filter((score): score is number => typeof score === 'number');
    const averageScore =
      scores.length > 0
        ? Number(
            (
              scores.reduce((sum, score) => sum + score, 0) / scores.length
            ).toFixed(2),
          )
        : null;

    return {
      approvals,
      totalApplications: applications.length,
      clients: uniqueApplicants,
      defaultRate,
      averageScore,
    };
  }

  private async evaluateApplication(id: string): Promise<RentalApplication> {
    const application = await this.applicationsRepository.findOne({
      where: { id },
      relations: ['property', 'creditAnalysis', 'insurancePolicy'],
    });

    if (!application) {
      throw new NotFoundException('Solicitação não encontrada para avaliação.');
    }

    // Buscar documentos associados à aplicação
    const documents = await this.documentsService.findByRelatedEntity(
      'rental_application',
      application.id,
    );

    // Tentar usar IA se disponível, caso contrário usar cálculo padrão
    let scoring: ScoringResult;
    try {
      if (this.aiService.isAIAvailable()) {
        scoring = await this.aiService.analyzeCreditApplication(
          application,
          documents,
        );
      } else {
        scoring = this.calculateScoring(application);
      }
    } catch (error) {
      // Se a IA falhar, usar cálculo padrão
      scoring = this.calculateScoring(application);
    }

    if (application.creditAnalysis) {
      await this.creditAnalysisRepository.delete({
        id: application.creditAnalysis.id,
      });
    }

    const analysis = this.creditAnalysisRepository.create({
      application,
      score: scoring.score,
      riskLevel: scoring.riskLevel,
      maximumCoverage: scoring.maximumCoverage,
      recommendedMonthlyFee: scoring.monthlyFee,
      recommendedAdhesionFee: scoring.adhesionFee,
      indicators: scoring.indicators,
      analystNotes: `Status sugerido: ${scoring.suggestedStatus}`,
    });
    await this.creditAnalysisRepository.save(analysis);

    application.status = scoring.suggestedStatus;
    application.creditAnalysis = analysis;
    await this.applicationsRepository.save(application);

    if (
      scoring.suggestedStatus === ApplicationStatus.APPROVED &&
      !application.insurancePolicy
    ) {
      await this.createPolicyForApplication(application.id, scoring);
    }

    const reloaded = await this.applicationsRepository.findOne({
      where: { id: application.id },
      relations: [
        'property',
        'property.owner',
        'applicant',
        'broker',
        'creditAnalysis',
        'insurancePolicy',
        'insurancePolicy.paymentSchedule',
      ],
    });

    if (!reloaded) {
      throw new NotFoundException(
        'Erro ao carregar a solicitação após avaliação.',
      );
    }

    return reloaded;
  }

  private calculateScoring(application: RentalApplication): ScoringResult {
    const coverageMultiplier = this.configService.get<number>(
      'app.metrics.defaultCoverageMultiplier',
      3,
    );
    const monthlyPremiumRate = this.configService.get<number>(
      'app.metrics.monthlyPremiumRate',
      0.15,
    );
    const adhesionFeeRate = this.configService.get<number>(
      'app.metrics.adhesionFeeRate',
      1,
    );

    const rent = Number(application.requestedRentValue);
    const income = Number(application.monthlyIncome);
    const incomeRentRatio = income > 0 ? rent / income : 1;
    const affordabilityScore = Math.max(0, 1 - incomeRentRatio);
    const negativePenalty = application.hasNegativeRecords ? 0.25 : 0;
    const baseScore =
      (affordabilityScore * 70 + (application.hasNegativeRecords ? 0 : 20)) /
      1.2;
    const score = Math.max(
      10,
      Math.min(100, Math.round(baseScore - negativePenalty * 100 + 10)),
    );

    let suggestedStatus = ApplicationStatus.IN_ANALYSIS;
    let riskLevel = RiskLevel.MEDIUM;

    if (score >= 75) {
      suggestedStatus = ApplicationStatus.APPROVED;
      riskLevel = RiskLevel.LOW;
    } else if (score <= 45) {
      suggestedStatus = ApplicationStatus.REJECTED;
      riskLevel = RiskLevel.HIGH;
    }

    const maximumCoverage = rent * coverageMultiplier;
    const monthlyFee = rent * monthlyPremiumRate;
    const adhesionFee = rent * adhesionFeeRate;

    const indicators = {
      income,
      rent,
      incomeRentRatio,
      coverageMultiplier,
      monthlyPremiumRate,
      adhesionFeeRate,
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

  private async createPolicyForApplication(
    applicationId: string,
    scoring?: ScoringResult,
  ): Promise<InsurancePolicy> {
    const application = await this.applicationsRepository.findOne({
      where: { id: applicationId },
      relations: ['property', 'creditAnalysis', 'insurancePolicy'],
    });
    if (!application) {
      throw new NotFoundException(
        'Solicitação não encontrada para criação da apólice.',
      );
    }
    if (application.insurancePolicy) {
      return application.insurancePolicy;
    }

    const analysis = scoring ? scoring : this.calculateScoring(application);

    const policy = this.policyRepository.create({
      policyNumber: this.generatePolicyNumber(),
      application,
      status: PolicyStatus.ACTIVE,
      coverageAmount: analysis.maximumCoverage,
      monthlyPremium: analysis.monthlyFee,
      adhesionFee: analysis.adhesionFee,
      startDate: new Date(),
    });

    const savedPolicy = await this.policyRepository.save(policy);
    await this.createPaymentSchedule(savedPolicy, analysis);
    return savedPolicy;
  }

  private async createPaymentSchedule(
    policy: InsurancePolicy,
    scoring: ScoringResult,
  ) {
    const schedule: PaymentSchedule[] = [];
    const startDate = new Date();

    // Taxa de adesão (pagamento único imediato)
    schedule.push(
      this.paymentRepository.create({
        policy,
        dueDate: startDate,
        amount: scoring.adhesionFee,
        status: PaymentStatus.PENDING,
        notes: 'Taxa de adesão',
      }),
    );

    for (let i = 1; i <= 12; i += 1) {
      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + i);
      schedule.push(
        this.paymentRepository.create({
          policy,
          dueDate,
          amount: scoring.monthlyFee,
          status: PaymentStatus.PENDING,
        }),
      );
    }

    await this.paymentRepository.save(schedule);
  }

  private generateApplicationNumber(): string {
    return `APP-${Date.now()}-${Math.floor(Math.random() * 9999)
      .toString()
      .padStart(4, '0')}`;
  }

  private generatePolicyNumber(): string {
    return `POL-${Date.now()}-${Math.floor(Math.random() * 9999)
      .toString()
      .padStart(4, '0')}`;
  }

  private async resolveApplicant(
    user: User,
    dto: CreateRentalApplicationDto,
  ): Promise<User> {
    if (user.role === UserRole.INQUILINO) {
      return user;
    }

    if (!dto.applicantId) {
      throw new BadRequestException(
        'É necessário informar o inquilino solicitante.',
      );
    }

    const applicant = await this.usersService.findById(dto.applicantId);
    if (!applicant || applicant.role !== UserRole.INQUILINO) {
      throw new BadRequestException('Inquilino informado é inválido.');
    }

    return applicant;
  }

  private async resolveBroker(
    user: User,
    dto: CreateRentalApplicationDto,
  ): Promise<User | undefined> {
    if (user.role === UserRole.CORRETOR) {
      return user;
    }

    if (dto.brokerId) {
      const broker = await this.usersService.findById(dto.brokerId);
      if (!broker || broker.role !== UserRole.CORRETOR) {
        throw new BadRequestException('Corretor informado é inválido.');
      }
      return broker;
    }

    return undefined;
  }

  async reanalyzeApplication(id: string): Promise<RentalApplication> {
    return this.evaluateApplication(id);
  }
}
