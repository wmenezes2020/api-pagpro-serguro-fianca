import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentSchedule } from '../applications/entities/payment-schedule.entity';
import { InsurancePolicy } from '../applications/entities/insurance-policy.entity';
import { PaymentStatus } from '../../common/enums/payment-status.enum';
import { PaymentMethod } from './payment-method.enum';
import { MockPaymentProviderService } from './providers/mock-payment-provider.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../../common/enums/notification-type.enum';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../../common/enums/user-role.enum';
import { WhatsAppNotificationService } from '../notifications/whatsapp-notification.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(PaymentSchedule)
    private readonly paymentRepository: Repository<PaymentSchedule>,
    @InjectRepository(InsurancePolicy)
    private readonly policyRepository: Repository<InsurancePolicy>,
    private readonly paymentProvider: MockPaymentProviderService,
    private readonly notificationsService: NotificationsService,
    private readonly whatsappService: WhatsAppNotificationService,
  ) {}

  async generatePayment(
    paymentId: string,
    paymentMethod: PaymentMethod,
  ): Promise<PaymentSchedule> {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
      relations: ['policy', 'policy.application', 'policy.application.applicant'],
    });

    if (!payment) {
      throw new NotFoundException('Pagamento não encontrado.');
    }

    if (payment.status !== PaymentStatus.PENDING) {
      throw new Error('Apenas pagamentos pendentes podem ser gerados.');
    }

    const applicant = payment.policy.application.applicant;
    const payerInfo = {
      name: applicant.fullName || applicant.email,
      document: applicant.inquilinoProfile?.cpf || '',
      email: applicant.email,
      phone: applicant.phone || applicant.inquilinoProfile?.phone,
    };

    try {
      if (paymentMethod === PaymentMethod.BOLETO) {
        const boletoData = await this.paymentProvider.generateBoleto(
          Number(payment.amount),
          payment.dueDate,
          payerInfo,
          `PagPro Seguro Fiança - Apólice ${payment.policy.policyNumber}`,
        );

        payment.paymentMethod = PaymentMethod.BOLETO;
        payment.barcode = boletoData.barcode;
        payment.paymentReference = boletoData.digitableLine;
        payment.externalPaymentId = boletoData.externalId;
        payment.paymentMetadata = {
          digitableLine: boletoData.digitableLine,
          pdfUrl: boletoData.pdfUrl,
        };
      } else if (paymentMethod === PaymentMethod.PIX) {
        const pixData = await this.paymentProvider.generatePix(
          Number(payment.amount),
          payment.dueDate,
          payerInfo,
          `PagPro Seguro Fiança - Apólice ${payment.policy.policyNumber}`,
        );

        payment.paymentMethod = PaymentMethod.PIX;
        payment.qrCode = pixData.qrCode;
        payment.qrCodeImageUrl = pixData.qrCodeImageUrl;
        payment.paymentReference = pixData.copyPaste;
        payment.externalPaymentId = pixData.externalId;
        payment.paymentMetadata = {
          copyPaste: pixData.copyPaste,
        };
      }

      const saved = await this.paymentRepository.save(payment);

      // Enviar notificações
      await this.sendPaymentNotification(saved);

      return saved;
    } catch (error) {
      this.logger.error(`Erro ao gerar pagamento: ${error.message}`, error.stack);
      throw error;
    }
  }

  async generatePaymentsForPolicy(
    policyId: string,
    paymentMethod: PaymentMethod = PaymentMethod.BOLETO,
  ): Promise<PaymentSchedule[]> {
    const policy = await this.policyRepository.findOne({
      where: { id: policyId },
      relations: ['paymentSchedule', 'application', 'application.applicant'],
    });

    if (!policy) {
      throw new NotFoundException('Apólice não encontrada.');
    }

    const pendingPayments = policy.paymentSchedule?.filter(
      (p) => p.status === PaymentStatus.PENDING && !p.externalPaymentId,
    ) || [];

    const generatedPayments: PaymentSchedule[] = [];

    for (const payment of pendingPayments) {
      try {
        const generated = await this.generatePayment(payment.id, paymentMethod);
        generatedPayments.push(generated);
      } catch (error) {
        this.logger.error(
          `Erro ao gerar pagamento ${payment.id}: ${error.message}`,
        );
      }
    }

    return generatedPayments;
  }

  async checkPaymentStatus(paymentId: string): Promise<PaymentSchedule> {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
      relations: ['policy'],
    });

    if (!payment) {
      throw new NotFoundException('Pagamento não encontrado.');
    }

    if (!payment.externalPaymentId) {
      return payment;
    }

    try {
      const status = await this.paymentProvider.checkPaymentStatus(
        payment.externalPaymentId,
      );

      if (status.status === 'PAID' && payment.status !== PaymentStatus.PAID) {
        payment.status = PaymentStatus.PAID;
        payment.paidAt = status.paidAt || new Date();
        await this.paymentRepository.save(payment);
      } else if (
        status.status === 'OVERDUE' &&
        payment.status !== PaymentStatus.OVERDUE
      ) {
        payment.status = PaymentStatus.OVERDUE;
        await this.paymentRepository.save(payment);
      }

      return payment;
    } catch (error) {
      this.logger.error(
        `Erro ao verificar status do pagamento: ${error.message}`,
      );
      return payment;
    }
  }

  private async sendPaymentNotification(
    payment: PaymentSchedule,
  ): Promise<void> {
    const policy = await this.policyRepository.findOne({
      where: { id: payment.policy.id },
      relations: ['application', 'application.applicant'],
    });

    if (!policy) {
      return;
    }

    const applicant = policy.application.applicant;
    const amount = Number(payment.amount).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
    const dueDate = new Date(payment.dueDate).toLocaleDateString('pt-BR');

    const methodName =
      payment.paymentMethod === PaymentMethod.BOLETO ? 'Boleto' : 'PIX';

    await this.notificationsService.createForUser(
      applicant,
      NotificationType.PAYMENT,
      `Nova cobrança gerada - ${methodName}`,
      `Uma nova cobrança de ${amount} foi gerada com vencimento em ${dueDate}. Método: ${methodName}.`,
      {
        paymentId: payment.id,
        amount: payment.amount,
        dueDate: payment.dueDate,
        paymentMethod: payment.paymentMethod,
      },
      true, // Enviar email
    );

    // Enviar WhatsApp
    try {
      await this.whatsappService.sendPaymentNotification(applicant, {
        amount: Number(payment.amount),
        dueDate: payment.dueDate,
        paymentMethod: payment.paymentMethod,
        barcode: payment.barcode,
        qrCode: payment.qrCode,
      });
    } catch (error) {
      this.logger.warn(`Falha ao enviar WhatsApp: ${error.message}`);
    }
  }

  async getInvoicesForUser(user: User): Promise<PaymentSchedule[]> {
    const queryBuilder = this.paymentRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.policy', 'policy')
      .leftJoinAndSelect('policy.application', 'application')
      .leftJoinAndSelect('application.applicant', 'applicant')
      .leftJoinAndSelect('application.property', 'property')
      .leftJoinAndSelect('property.owner', 'propertyOwner')
      .leftJoinAndSelect('application.broker', 'broker');

    // Admin vê todas as faturas
    if (user.role === UserRole.ADMIN || user.role === UserRole.DIRECTOR) {
      return queryBuilder.getMany();
    }

    // Imobiliária vê faturas dos seus imóveis
    if (user.role === UserRole.IMOBILIARIA) {
      queryBuilder.where('propertyOwner.id = :imobiliariaId', {
        imobiliariaId: user.id,
      });
      return queryBuilder.getMany();
    }

    // Inquilino vê apenas suas próprias faturas
    if (user.role === UserRole.INQUILINO) {
      queryBuilder.where('applicant.id = :applicantId', {
        applicantId: user.id,
      });
      return queryBuilder.getMany();
    }

    // Franqueado vê faturas das imobiliárias vinculadas
    if (user.role === UserRole.FRANQUEADO) {
      queryBuilder
        .leftJoin('propertyOwner.parent', 'franqueado')
        .where('franqueado.id = :franqueadoId', {
          franqueadoId: user.id,
        });
      return queryBuilder.getMany();
    }

    // Corretor vê faturas dos seus clientes
    if (user.role === UserRole.CORRETOR) {
      queryBuilder.where('broker.id = :brokerId', {
        brokerId: user.id,
      });
      return queryBuilder.getMany();
    }

    return [];
  }

  async getInvoiceById(
    paymentId: string,
    user: User,
  ): Promise<PaymentSchedule> {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
      relations: [
        'policy',
        'policy.application',
        'policy.application.applicant',
        'policy.application.property',
        'policy.application.property.owner',
        'policy.application.property.owner.parent',
        'policy.application.broker',
      ],
    });

    if (!payment) {
      throw new NotFoundException('Fatura não encontrada.');
    }

    // Verificar permissões de acesso
    const applicant = payment.policy.application.applicant;
    const propertyOwner = payment.policy.application.property?.owner;
    const broker = payment.policy.application.broker;

    // Admin e Director podem ver qualquer fatura
    if (user.role === UserRole.ADMIN || user.role === UserRole.DIRECTOR) {
      return payment;
    }

    // Inquilino pode ver apenas suas próprias faturas
    if (user.role === UserRole.INQUILINO && applicant.id === user.id) {
      return payment;
    }

    // Imobiliária pode ver faturas dos seus imóveis
    if (user.role === UserRole.IMOBILIARIA && propertyOwner?.id === user.id) {
      return payment;
    }

    // Franqueado pode ver faturas das imobiliárias vinculadas
    if (
      user.role === UserRole.FRANQUEADO &&
      propertyOwner?.parent?.id === user.id
    ) {
      return payment;
    }

    // Corretor pode ver faturas dos seus clientes
    if (user.role === UserRole.CORRETOR && broker?.id === user.id) {
      return payment;
    }

    throw new ForbiddenException(
      'Você não tem permissão para visualizar esta fatura.',
    );
  }
}
