import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { PaymentSchedule } from '../applications/entities/payment-schedule.entity';
import { InsurancePolicy } from '../applications/entities/insurance-policy.entity';
import { PaymentStatus } from '../../common/enums/payment-status.enum';
import { PaymentMethod } from './payment-method.enum';
import { PaymentsService } from './payments.service';

/**
 * Serviço de cron jobs para geração automática de cobranças
 */
@Injectable()
export class PaymentsCronService {
  private readonly logger = new Logger(PaymentsCronService.name);

  constructor(
    @InjectRepository(PaymentSchedule)
    private readonly paymentRepository: Repository<PaymentSchedule>,
    @InjectRepository(InsurancePolicy)
    private readonly policyRepository: Repository<InsurancePolicy>,
    private readonly paymentsService: PaymentsService,
  ) {}

  /**
   * Gera cobranças automaticamente para pagamentos que estão próximos do vencimento
   * Executa diariamente às 8h da manhã
   */
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async generateUpcomingPayments() {
    this.logger.log('🔄 Iniciando geração automática de cobranças...');

    try {
      // Buscar pagamentos pendentes que vencem nos próximos 7 dias e ainda não foram gerados
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

      const pendingPayments = await this.paymentRepository.find({
        where: {
          status: PaymentStatus.PENDING,
          dueDate: LessThanOrEqual(sevenDaysFromNow),
          externalPaymentId: null as any, // Pagamentos ainda não gerados
        },
        relations: ['policy', 'policy.application', 'policy.application.applicant'],
      });

      this.logger.log(`📋 Encontrados ${pendingPayments.length} pagamentos para gerar.`);

      let generatedCount = 0;
      let errorCount = 0;

      for (const payment of pendingPayments) {
        try {
          // Gerar como Boleto por padrão (pode ser configurável)
          await this.paymentsService.generatePayment(
            payment.id,
            PaymentMethod.BOLETO,
          );
          generatedCount++;
        } catch (error) {
          this.logger.error(
            `❌ Erro ao gerar pagamento ${payment.id}: ${error.message}`,
          );
          errorCount++;
        }
      }

      this.logger.log(
        `✅ Geração automática concluída: ${generatedCount} gerados, ${errorCount} erros.`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Erro na geração automática de cobranças: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Verifica e atualiza status de pagamentos vencidos
   * Executa diariamente às 9h da manhã
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async checkOverduePayments() {
    this.logger.log('🔄 Verificando pagamentos vencidos...');

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const overduePayments = await this.paymentRepository.find({
        where: {
          status: PaymentStatus.PENDING,
          dueDate: LessThanOrEqual(today),
        },
      });

      if (overduePayments.length > 0) {
        await this.paymentRepository.update(
          { id: overduePayments.map((p) => p.id) as any },
          { status: PaymentStatus.OVERDUE },
        );

        this.logger.log(
          `⚠️ ${overduePayments.length} pagamentos marcados como vencidos.`,
        );
      } else {
        this.logger.log('✅ Nenhum pagamento vencido encontrado.');
      }
    } catch (error) {
      this.logger.error(
        `❌ Erro ao verificar pagamentos vencidos: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Verifica status de pagamentos com provedores externos
   * Executa a cada 6 horas
   */
  @Cron(CronExpression.EVERY_6_HOURS)
  async checkPaymentStatus() {
    this.logger.log('🔄 Verificando status de pagamentos...');

    try {
      const pendingPayments = await this.paymentRepository.find({
        where: {
          status: PaymentStatus.PENDING,
          externalPaymentId: null as any,
        },
        take: 50, // Limitar para não sobrecarregar
      });

      for (const payment of pendingPayments) {
        if (payment.externalPaymentId) {
          try {
            await this.paymentsService.checkPaymentStatus(payment.id);
          } catch (error) {
            this.logger.warn(
              `⚠️ Erro ao verificar status do pagamento ${payment.id}: ${error.message}`,
            );
          }
        }
      }

      this.logger.log('✅ Verificação de status concluída.');
    } catch (error) {
      this.logger.error(
        `❌ Erro na verificação de status: ${error.message}`,
        error.stack,
      );
    }
  }
}
