import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommissionsService } from './commissions.service';
import { CommissionsController } from './commissions.controller';
import { Commission } from './entities/commission.entity';
import { CommissionRate } from './entities/commission-rate.entity';
import { Referral } from './entities/referral.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Commission, CommissionRate, Referral]),
  ],
  controllers: [CommissionsController],
  providers: [CommissionsService],
  exports: [CommissionsService],
})
export class CommissionsModule {}

