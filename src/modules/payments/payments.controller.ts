import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Query,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../../common/enums/user-role.enum';
import { PaymentMethod } from './payment-method.enum';

@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('invoices')
  @Roles(
    UserRole.ADMIN,
    UserRole.DIRECTOR,
    UserRole.FRANQUEADO,
    UserRole.IMOBILIARIA,
  )
  async getInvoices(@CurrentUser() user: User) {
    // Retorna todas as faturas visíveis para o usuário
    // Implementação será feita no serviço
    return this.paymentsService.getInvoicesForUser(user);
  }

  @Get('invoices/:paymentId')
  async getInvoice(
    @Param('paymentId') paymentId: string,
    @CurrentUser() user: User,
  ) {
    return this.paymentsService.getInvoiceById(paymentId, user);
  }

  @Post('invoices/:paymentId/generate')
  @Roles(
    UserRole.ADMIN,
    UserRole.DIRECTOR,
    UserRole.FRANQUEADO,
    UserRole.IMOBILIARIA,
  )
  async generatePayment(
    @Param('paymentId') paymentId: string,
    @Body('paymentMethod') paymentMethod: PaymentMethod,
    @CurrentUser() user: User,
  ) {
    return this.paymentsService.generatePayment(paymentId, paymentMethod);
  }

  @Post('policies/:policyId/generate-all')
  @Roles(
    UserRole.ADMIN,
    UserRole.DIRECTOR,
    UserRole.FRANQUEADO,
    UserRole.IMOBILIARIA,
  )
  async generateAllPayments(
    @Param('policyId') policyId: string,
    @Body('paymentMethod') paymentMethod: PaymentMethod = PaymentMethod.BOLETO,
    @CurrentUser() user: User,
  ) {
    return this.paymentsService.generatePaymentsForPolicy(
      policyId,
      paymentMethod,
    );
  }

  @Post('invoices/:paymentId/check-status')
  async checkPaymentStatus(
    @Param('paymentId') paymentId: string,
    @CurrentUser() user: User,
  ) {
    return this.paymentsService.checkPaymentStatus(paymentId);
  }
}
