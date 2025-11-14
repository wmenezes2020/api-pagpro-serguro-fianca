import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ImobiliariaBroker } from './entities/imobiliaria-broker.entity';
import { ImobiliariaBrokersService } from './imobiliaria-brokers.service';
import { ImobiliariaBrokersController } from './imobiliaria-brokers.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ImobiliariaBroker])],
  controllers: [ImobiliariaBrokersController],
  providers: [ImobiliariaBrokersService],
  exports: [ImobiliariaBrokersService],
})
export class ImobiliariaBrokersModule {}
