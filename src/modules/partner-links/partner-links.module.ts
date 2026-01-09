import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PartnerLink } from './entities/partner-link.entity';
import { PartnerLinksService } from './partner-links.service';
import { PartnerLinksController } from './partner-links.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PartnerLink])],
  controllers: [PartnerLinksController],
  providers: [PartnerLinksService],
  exports: [PartnerLinksService],
})
export class PartnerLinksModule {}
