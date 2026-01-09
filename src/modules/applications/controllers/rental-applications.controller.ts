import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { RentalApplicationsService } from '../services/rental-applications.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CreateRentalApplicationDto } from '../dto/create-rental-application.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { User } from '../../users/entities/user.entity';
import { UpdateApplicationStatusDto } from '../dto/update-application-status.dto';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../../common/enums/user-role.enum';
import { UpdatePaymentStatusDto } from '../dto/update-payment-status.dto';
import { DocumentsService } from '../../documents/documents.service';

@Controller('applications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RentalApplicationsController {
  constructor(
    private readonly applicationsService: RentalApplicationsService,
    private readonly documentsService: DocumentsService,
  ) {}

  @Post()
  async create(
    @Body() dto: CreateRentalApplicationDto,
    @CurrentUser() user: User,
  ) {
    return this.applicationsService.createApplication(user, dto);
  }

  @Get()
  async list(@CurrentUser() user: User) {
    return this.applicationsService.findAllForUser(user);
  }

  @Get('dashboard/kpis')
  async getKpis(@CurrentUser() user: User) {
    return this.applicationsService.getDashboardMetrics(user);
  }

  @Get(':id')
  async findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: User,
  ) {
    return this.applicationsService.findOneForUser(id, user);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN, UserRole.IMOBILIARIA)
  async updateStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateApplicationStatusDto,
    @CurrentUser() user: User,
  ) {
    return this.applicationsService.updateStatus(id, dto, user);
  }

  @Patch('payments/status')
  @Roles(UserRole.ADMIN, UserRole.IMOBILIARIA)
  async updatePaymentStatus(
    @Body() dto: UpdatePaymentStatusDto,
    @CurrentUser() user: User,
  ) {
    return this.applicationsService.updatePaymentStatus(dto, user);
  }

  @Post(':id/documents')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @Param('id', new ParseUUIDPipe()) id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: User,
    @Body('description') description?: string,
  ) {
    // Verificar se a aplicação existe e o usuário tem acesso
    await this.applicationsService.findOneForUser(id, user);

    return this.documentsService.upload(
      file,
      user,
      'rental_application',
      id,
      description,
    );
  }

  @Get(':id/documents')
  async getDocuments(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: User,
  ) {
    // Verificar se a aplicação existe e o usuário tem acesso
    await this.applicationsService.findOneForUser(id, user);

    return this.documentsService.findByRelatedEntity('rental_application', id);
  }

  @Post(':id/reanalyze')
  async reanalyze(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: User,
  ) {
    // Verificar se a aplicação existe e o usuário tem acesso
    await this.applicationsService.findOneForUser(id, user);

    return this.applicationsService.reanalyzeApplication(id);
  }
}
