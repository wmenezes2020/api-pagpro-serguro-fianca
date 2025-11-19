import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { PartnerLinksService } from './partner-links.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { CreatePartnerLinkDto } from './dto/create-partner-link.dto';
import { UpdatePartnerLinkDto } from './dto/update-partner-link.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@Controller('partner-links')
export class PartnerLinksController {
  constructor(private readonly partnerLinksService: PartnerLinksService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.ADMIN,
    UserRole.DIRECTOR,
    UserRole.FRANQUEADO,
    UserRole.IMOBILIARIA,
    UserRole.CORRETOR,
    UserRole.INQUILINO,
  )
  @Post()
  async create(
    @CurrentUser() user: User,
    @Body() dto: CreatePartnerLinkDto,
  ) {
    return this.partnerLinksService.createLink(user, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.ADMIN,
    UserRole.DIRECTOR,
    UserRole.FRANQUEADO,
    UserRole.IMOBILIARIA,
    UserRole.CORRETOR,
    UserRole.INQUILINO,
  )
  @Get()
  async list(@CurrentUser() user: User) {
    return this.partnerLinksService.listByCreator(user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.ADMIN,
    UserRole.DIRECTOR,
    UserRole.FRANQUEADO,
    UserRole.IMOBILIARIA,
    UserRole.CORRETOR,
    UserRole.INQUILINO,
  )
  @Put(':id')
  async update(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: UpdatePartnerLinkDto,
  ) {
    return this.partnerLinksService.updateLink(id, user.id, dto);
  }

  @Get(':token')
  async publicDetails(@Param('token') token: string) {
    return this.partnerLinksService.getPublicDetails(token);
  }
}


