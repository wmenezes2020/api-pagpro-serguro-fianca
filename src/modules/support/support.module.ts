import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SupportTicket } from './entities/support-ticket.entity';
import { SupportService } from './support.service';
import { SupportController } from './support.controller';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [TypeOrmModule.forFeature([SupportTicket]), UsersModule],
  controllers: [SupportController],
  providers: [SupportService],
})
export class SupportModule {}
