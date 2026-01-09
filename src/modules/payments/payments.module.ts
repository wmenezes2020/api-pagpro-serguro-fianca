import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PaymentsCronService } from './payments-cron.service';
import { PaymentSchedule } from '../applications/entities/payment-schedule.entity';
import { InsurancePolicy } from '../applications/entities/insurance-policy.entity';
import { MockPaymentProviderService } from './providers/mock-payment-provider.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([PaymentSchedule, InsurancePolicy]),
    NotificationsModule,
  ],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    MockPaymentProviderService,
    PaymentsCronService,
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
