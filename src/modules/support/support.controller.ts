import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { SupportService } from './support.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { UpdateSupportTicketDto } from './dto/update-support-ticket.dto';

@Controller('support')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Post()
  async create(@Body() dto: CreateSupportTicketDto, @CurrentUser() user: User) {
    return this.supportService.create(dto, user);
  }

  @Get()
  async list(@CurrentUser() user: User) {
    return this.supportService.findAll(user);
  }

  @Patch(':id')
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateSupportTicketDto,
    @CurrentUser() user: User,
  ) {
    return this.supportService.update(id, dto, user);
  }
}
