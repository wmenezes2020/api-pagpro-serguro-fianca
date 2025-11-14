import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Property } from './entities/property.entity';
import { RentalApplication } from './entities/rental-application.entity';
import { CreditAnalysis } from './entities/credit-analysis.entity';
import { InsurancePolicy } from './entities/insurance-policy.entity';
import { PaymentSchedule } from './entities/payment-schedule.entity';
import { PropertiesService } from './services/properties.service';
import { RentalApplicationsService } from './services/rental-applications.service';
import { PropertiesController } from './controllers/properties.controller';
import { RentalApplicationsController } from './controllers/rental-applications.controller';
import { UsersModule } from '../users/users.module';
import { AIModule } from '../ai/ai.module';
import { DocumentsModule } from '../documents/documents.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Property,
      RentalApplication,
      CreditAnalysis,
      InsurancePolicy,
      PaymentSchedule,
    ]),
    UsersModule,
    AIModule,
    DocumentsModule,
  ],
  providers: [PropertiesService, RentalApplicationsService],
  controllers: [PropertiesController, RentalApplicationsController],
  exports: [RentalApplicationsService],
})
export class ApplicationsModule {}
