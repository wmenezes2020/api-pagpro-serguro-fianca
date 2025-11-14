import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ImobiliariaBrokersService } from './imobiliaria-brokers.service';
import { CreateImobiliariaBrokerDto } from './dto/create-imobiliaria-broker.dto';
import { UpdateImobiliariaBrokerDto } from './dto/update-imobiliaria-broker.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { BrokerStatus } from '../../common/enums/broker-status.enum';

@Controller('imobiliaria/brokers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.IMOBILIARIA, UserRole.ADMIN)
export class ImobiliariaBrokersController {
  constructor(
    private readonly imobiliariaBrokersService: ImobiliariaBrokersService,
  ) {}

  @Post()
  create(@Body() dto: CreateImobiliariaBrokerDto, @CurrentUser() user: User) {
    return this.imobiliariaBrokersService.create(dto, user);
  }

  @Get()
  findAll(
    @CurrentUser() user: User,
    @Query('status') status?: BrokerStatus,
    @Query('search') search?: string,
  ) {
    return this.imobiliariaBrokersService.findAll({
      ownerId: user.id,
      status,
      search,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.imobiliariaBrokersService.findOne(id, user.id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateImobiliariaBrokerDto,
    @CurrentUser() user: User,
  ) {
    return this.imobiliariaBrokersService.update(id, user.id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.imobiliariaBrokersService.remove(id, user.id);
  }
}
