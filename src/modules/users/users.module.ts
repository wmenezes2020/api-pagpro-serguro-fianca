import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { ImobiliariaProfile } from './entities/imobiliaria-profile.entity';
import { InquilinoProfile } from './entities/inquilino-profile.entity';
import { CorretorProfile } from './entities/corretor-profile.entity';
import { FranqueadoProfile } from './entities/franqueado-profile.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      ImobiliariaProfile,
      InquilinoProfile,
      CorretorProfile,
      FranqueadoProfile,
    ]),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService, TypeOrmModule],
})
export class UsersModule {}
