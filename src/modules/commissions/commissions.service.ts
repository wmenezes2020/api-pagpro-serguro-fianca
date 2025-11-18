import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Commission } from './entities/commission.entity';
import { CommissionRate } from './entities/commission-rate.entity';
import { Referral } from './entities/referral.entity';
import { CreateCommissionRateDto } from './dto/create-commission-rate.dto';
import { UpdateCommissionRateDto } from './dto/update-commission-rate.dto';
import { User } from '../users/entities/user.entity';
import { RentalApplication } from '../applications/entities/rental-application.entity';

@Injectable()
export class CommissionsService {
  constructor(
    @InjectRepository(Commission)
    private commissionRepository: Repository<Commission>,
    @InjectRepository(CommissionRate)
    private commissionRateRepository: Repository<CommissionRate>,
    @InjectRepository(Referral)
    private referralRepository: Repository<Referral>,
  ) {}

  // Commission Rates
  async createCommissionRate(dto: CreateCommissionRateDto): Promise<CommissionRate> {
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

  // Commissions
  async createCommission(
    beneficiary: User,
    amount: number,
    percentage: number,
    commissionType: string,
    application?: RentalApplication,
    referral?: Referral,
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
    return this.commissionRepository.save(commission);
  }

  async calculateCommission(
    role: string,
    commissionType: string,
    baseAmount: number,
  ): Promise<{ amount: number; percentage: number }> {
    const rate = await this.commissionRateRepository.findOne({
      where: {
        role: role as any,
        commissionType,
        isActive: true,
      },
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

  async getCommissionSummary(userId: string): Promise<{
    totalPending: number;
    totalApproved: number;
    totalPaid: number;
    totalAmount: number;
  }> {
    const commissions = await this.findAllCommissions(userId);

    return {
      totalPending: commissions.filter((c) => c.status === 'PENDING').length,
      totalApproved: commissions.filter((c) => c.status === 'APPROVED').length,
      totalPaid: commissions.filter((c) => c.status === 'PAID').length,
      totalAmount: commissions
        .filter((c) => c.status === 'PAID')
        .reduce((sum, c) => sum + Number(c.amount), 0),
    };
  }
}

