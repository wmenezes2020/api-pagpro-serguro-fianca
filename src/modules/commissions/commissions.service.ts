import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Commission } from './entities/commission.entity';
import { CommissionRate } from './entities/commission-rate.entity';
import { Referral } from './entities/referral.entity';
import { CreateCommissionRateDto } from './dto/create-commission-rate.dto';
import { UpdateCommissionRateDto } from './dto/update-commission-rate.dto';
import { PayoutRule } from './entities/payout-rule.entity';
import { UpdatePayoutRuleDto } from './dto/update-payout-rule.dto';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../../common/enums/user-role.enum';
import { RentalApplication } from '../applications/entities/rental-application.entity';

const DEFAULT_PAYOUT_RULES: Array<{ role: UserRole; percentage: number }> = [
  { role: UserRole.DIRECTOR, percentage: 10 },
  { role: UserRole.FRANQUEADO, percentage: 15 },
  { role: UserRole.IMOBILIARIA, percentage: 10 },
  { role: UserRole.CORRETOR, percentage: 5 },
  { role: UserRole.INQUILINO, percentage: 5 },
];

@Injectable()
export class CommissionsService implements OnModuleInit {
  private payoutRulesCache: Map<UserRole, number> | null = null;

  constructor(
    @InjectRepository(Commission)
    private readonly commissionRepository: Repository<Commission>,
    @InjectRepository(CommissionRate)
    private readonly commissionRateRepository: Repository<CommissionRate>,
    @InjectRepository(Referral)
    private readonly referralRepository: Repository<Referral>,
    @InjectRepository(PayoutRule)
    private readonly payoutRuleRepository: Repository<PayoutRule>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.seedDefaultPayoutRules();
  }

  // Commission Rates
  async createCommissionRate(
    dto: CreateCommissionRateDto,
  ): Promise<CommissionRate> {
    const rate = this.commissionRateRepository.create(dto);
    return this.commissionRateRepository.save(rate);
  }

  async findAllCommissionRates(): Promise<CommissionRate[]> {
    return this.commissionRateRepository.find({
      order: { role: 'ASC', commissionType: 'ASC' },
    });
  }

  async findCommissionRateById(id: string): Promise<CommissionRate> {
    const rate = await this.commissionRateRepository.findOne({ where: { id } });
    if (!rate) {
      throw new NotFoundException('Taxa de comissão não encontrada');
    }
    return rate;
  }

  async updateCommissionRate(
    id: string,
    dto: UpdateCommissionRateDto,
  ): Promise<CommissionRate> {
    const rate = await this.findCommissionRateById(id);
    Object.assign(rate, dto);
    return this.commissionRateRepository.save(rate);
  }

  async deleteCommissionRate(id: string): Promise<void> {
    const rate = await this.findCommissionRateById(id);
    await this.commissionRateRepository.remove(rate);
  }

  // Payout rules
  async listPayoutRules(): Promise<PayoutRule[]> {
    return this.payoutRuleRepository.find({ order: { role: 'ASC' } });
  }

  async updatePayoutRule(dto: UpdatePayoutRuleDto): Promise<PayoutRule> {
    const existing =
      (await this.payoutRuleRepository.findOne({
        where: { role: dto.role },
      })) ??
      this.payoutRuleRepository.create({
        role: dto.role,
        percentage: dto.percentage,
      });

    existing.percentage = dto.percentage;
    const saved = await this.payoutRuleRepository.save(existing);
    this.payoutRulesCache = null;
    return saved;
  }

  // Commissions
  async createCommission(
    beneficiary: User,
    amount: number,
    percentage: number,
    commissionType: string,
    application?: RentalApplication,
    referral?: Referral,
    distributeHierarchy = true,
  ): Promise<Commission> {
    const commission = this.commissionRepository.create({
      beneficiary,
      amount,
      percentage,
      commissionType,
      status: 'PENDING',
      application,
      referral,
    });
    const saved = await this.commissionRepository.save(commission);

    if (distributeHierarchy) {
      await this.distributeHierarchyEarnings(
        beneficiary.id,
        amount,
        commissionType,
        application,
      );
    }

    return saved;
  }

  async calculateCommissionAmount(
    role: UserRole,
    commissionType: string,
    baseAmount: number,
  ): Promise<{ amount: number; percentage: number }> {
    const rate = await this.commissionRateRepository.findOne({
      where: { role, commissionType, isActive: true },
    });

    if (!rate) {
      return { amount: 0, percentage: 0 };
    }

    const amount = (baseAmount * rate.percentage) / 100;
    return { amount, percentage: rate.percentage };
  }

  async findAllCommissions(userId?: string): Promise<Commission[]> {
    const query = this.commissionRepository
      .createQueryBuilder('commission')
      .leftJoinAndSelect('commission.beneficiary', 'beneficiary')
      .leftJoinAndSelect('commission.application', 'application')
      .leftJoinAndSelect('commission.referral', 'referral')
      .orderBy('commission.createdAt', 'DESC');

    if (userId) {
      query.where('beneficiary.id = :userId', { userId });
    }

    return query.getMany();
  }

  async findCommissionById(id: string): Promise<Commission> {
    const commission = await this.commissionRepository.findOne({
      where: { id },
      relations: ['beneficiary', 'application', 'referral'],
    });
    if (!commission) {
      throw new NotFoundException('Comissão não encontrada');
    }
    return commission;
  }

  async updateCommissionStatus(
    id: string,
    status: 'PENDING' | 'APPROVED' | 'PAID' | 'CANCELLED',
  ): Promise<Commission> {
    const commission = await this.findCommissionById(id);
    commission.status = status;
    if (status === 'PAID') {
      commission.paidAt = new Date();
    }
    return this.commissionRepository.save(commission);
  }

  // Referrals
  async createReferral(
    referrer: User,
    referred: User,
    application?: RentalApplication,
  ): Promise<Referral> {
    const referral = this.referralRepository.create({
      referrer,
      referred,
      application,
      status: 'PENDING',
    });
    return this.referralRepository.save(referral);
  }

  async findAllReferrals(userId?: string): Promise<Referral[]> {
    const query = this.referralRepository
      .createQueryBuilder('referral')
      .leftJoinAndSelect('referral.referrer', 'referrer')
      .leftJoinAndSelect('referral.referred', 'referred')
      .leftJoinAndSelect('referral.application', 'application')
      .orderBy('referral.createdAt', 'DESC');

    if (userId) {
      query.where('referrer.id = :userId OR referred.id = :userId', { userId });
    }

    return query.getMany();
  }

  async getCommissionSummary(userId: string) {
    const commissions = await this.findAllCommissions(userId);
    const summary = {
      pendingAmount: 0,
      approvedAmount: 0,
      paidAmount: 0,
      totalAmount: 0,
    };

    commissions.forEach((commission) => {
      const amount = Number(commission.amount);
      if (commission.status === 'PENDING') {
        summary.pendingAmount += amount;
      }
      if (commission.status === 'APPROVED') {
        summary.approvedAmount += amount;
      }
      if (commission.status === 'PAID') {
        summary.paidAmount += amount;
      }
      summary.totalAmount += amount;
    });

    return summary;
  }

  private async seedDefaultPayoutRules(): Promise<void> {
    for (const rule of DEFAULT_PAYOUT_RULES) {
      const exists = await this.payoutRuleRepository.exists({
        where: { role: rule.role },
      });
      if (!exists) {
        await this.payoutRuleRepository.save(
          this.payoutRuleRepository.create(rule),
        );
      }
    }
  }

  private async getPayoutRulesMap(): Promise<Map<UserRole, number>> {
    if (this.payoutRulesCache) {
      return this.payoutRulesCache;
    }
    const rules = await this.payoutRuleRepository.find();
    this.payoutRulesCache = new Map(
      rules.map((rule) => [rule.role, Number(rule.percentage)]),
    );
    return this.payoutRulesCache;
  }

  private async distributeHierarchyEarnings(
    originUserId: string,
    baseAmount: number,
    commissionType: string,
    application?: RentalApplication,
  ): Promise<void> {
    const payoutMap = await this.getPayoutRulesMap();
    let current = await this.userRepository.findOne({
      where: { id: originUserId },
      relations: ['parent'],
    });

    while (current?.parent) {
      const parent = await this.userRepository.findOne({
        where: { id: current.parent.id },
        relations: ['parent'],
      });
      if (!parent) {
        break;
      }

      const percentage = payoutMap.get(parent.role);
      if (percentage && percentage > 0) {
        const amount = (baseAmount * percentage) / 100;
        const override = this.commissionRepository.create({
          beneficiary: parent,
          amount,
          percentage,
          commissionType: `${commissionType}_OVERRIDE`,
          status: 'PENDING',
          application,
          notes: 'Comissão hierárquica automática',
        });
        await this.commissionRepository.save(override);
      }

      current = parent;
    }
  }
}
