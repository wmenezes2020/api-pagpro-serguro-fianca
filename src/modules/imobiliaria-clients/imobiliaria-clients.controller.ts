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
import { ImobiliariaClientsService } from './imobiliaria-clients.service';
import { CreateImobiliariaClientDto } from './dto/create-imobiliaria-client.dto';
import { UpdateImobiliariaClientDto } from './dto/update-imobiliaria-client.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { ClientStatus } from '../../common/enums/client-status.enum';

@Controller('imobiliaria/clients')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.IMOBILIARIA, UserRole.ADMIN)
export class ImobiliariaClientsController {
  constructor(
    private readonly imobiliariaClientsService: ImobiliariaClientsService,
  ) {}

  @Post()
  create(@Body() dto: CreateImobiliariaClientDto, @CurrentUser() user: User) {
    return this.imobiliariaClientsService.create(dto, user);
  }

  @Get()
  findAll(
    @CurrentUser() user: User,
    @Query('status') status?: ClientStatus,
    @Query('search') search?: string,
  ) {
    return this.imobiliariaClientsService.findAll({
      ownerId: user.id,
      status,
      search,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.imobiliariaClientsService.findOne(id, user.id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateImobiliariaClientDto,
    @CurrentUser() user: User,
  ) {
    return this.imobiliariaClientsService.update(id, user.id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.imobiliariaClientsService.remove(id, user.id);
  }
}
