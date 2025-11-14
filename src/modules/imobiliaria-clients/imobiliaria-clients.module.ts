import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ImobiliariaClient } from './entities/imobiliaria-client.entity';
import { ImobiliariaClientsService } from './imobiliaria-clients.service';
import { ImobiliariaClientsController } from './imobiliaria-clients.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ImobiliariaClient])],
  controllers: [ImobiliariaClientsController],
  providers: [ImobiliariaClientsService],
  exports: [ImobiliariaClientsService],
})
export class ImobiliariaClientsModule {}
