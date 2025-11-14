import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { PropertiesService } from '../services/properties.service';
import { CreatePropertyDto } from '../dto/create-property.dto';
import { UpdatePropertyDto } from '../dto/update-property.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../../common/enums/user-role.enum';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { User } from '../../users/entities/user.entity';

@Controller('properties')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @Post()
  @Roles(UserRole.IMOBILIARIA, UserRole.ADMIN)
  async create(@Body() dto: CreatePropertyDto, @CurrentUser() user: User) {
    return this.propertiesService.create(dto, user);
  }

  @Get()
  async findAll() {
    return this.propertiesService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.propertiesService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.IMOBILIARIA, UserRole.ADMIN)
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdatePropertyDto,
    @CurrentUser() user: User,
  ) {
    return this.propertiesService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(UserRole.IMOBILIARIA, UserRole.ADMIN)
  async remove(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: User,
  ) {
    await this.propertiesService.remove(id, user);
    return { success: true };
  }
}
