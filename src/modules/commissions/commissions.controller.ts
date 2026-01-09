import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { CommissionsService } from './commissions.service';
import { CreateCommissionRateDto } from './dto/create-commission-rate.dto';
import { UpdateCommissionRateDto } from './dto/update-commission-rate.dto';
import { UpdatePayoutRuleDto } from './dto/update-payout-rule.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';

@Controller('commissions')
@UseGuards(JwtAuthGuard)
export class CommissionsController {
  constructor(private readonly commissionsService: CommissionsService) {}

  // Commission Rates (Admin only)
  @Post('rates')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async createCommissionRate(@Body() dto: CreateCommissionRateDto) {
    return this.commissionsService.createCommissionRate(dto);
  }

  @Get('rates')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async findAllCommissionRates() {
    return this.commissionsService.findAllCommissionRates();
  }

  @Get('rates/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async findCommissionRateById(@Param('id') id: string) {
    return this.commissionsService.findCommissionRateById(id);
  }

  @Put('rates/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async updateCommissionRate(
    @Param('id') id: string,
    @Body() dto: UpdateCommissionRateDto,
  ) {
    return this.commissionsService.updateCommissionRate(id, dto);
  }

  @Delete('rates/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async deleteCommissionRate(@Param('id') id: string) {
    await this.commissionsService.deleteCommissionRate(id);
    return { message: 'Taxa de comissão removida com sucesso' };
  }

  // Payout rules
  @Get('payout-rules')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async listPayoutRules() {
    return this.commissionsService.listPayoutRules();
  }

  @Put('payout-rules')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async updatePayoutRule(@Body() dto: UpdatePayoutRuleDto) {
    return this.commissionsService.updatePayoutRule(dto);
  }

  // Commissions
  @Get()
  async findAllCommissions(@Request() req) {
    const userId = req.user.role === UserRole.ADMIN ? undefined : req.user.id;
    return this.commissionsService.findAllCommissions(userId);
  }

  @Get('summary')
  async getCommissionSummary(@Request() req) {
    return this.commissionsService.getCommissionSummary(req.user.id);
  }

  @Get(':id')
  async findCommissionById(@Param('id') id: string) {
    return this.commissionsService.findCommissionById(id);
  }

  @Put(':id/status')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async updateCommissionStatus(
    @Param('id') id: string,
    @Body() body: { status: 'PENDING' | 'APPROVED' | 'PAID' | 'CANCELLED' },
  ) {
    return this.commissionsService.updateCommissionStatus(id, body.status);
  }

  // Referrals
  @Get('referrals')
  async findAllReferrals(@Request() req) {
    const userId = req.user.role === UserRole.ADMIN ? undefined : req.user.id;
    return this.commissionsService.findAllReferrals(userId);
  }
}
