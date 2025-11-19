import { Body, Controller, Post, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthResponse, AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterImobiliariaDto } from './dto/register-imobiliaria.dto';
import { RegisterInquilinoDto } from './dto/register-inquilino.dto';
import { RegisterCorretorDto } from './dto/register-corretor.dto';
import { RegisterFranqueadoDto } from './dto/register-franqueado.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() dto: LoginDto): Promise<AuthResponse> {
    const user = await this.authService.validateUser(dto.email, dto.password);
    return this.authService.login(user);
  }

  @Post('register/imobiliaria')
  async registerImobiliaria(
    @Body() dto: RegisterImobiliariaDto,
  ): Promise<AuthResponse> {
    return this.authService.registerImobiliaria(dto);
  }

  @Post('register/inquilino')
  async registerInquilino(
    @Body() dto: RegisterInquilinoDto,
  ): Promise<AuthResponse> {
    return this.authService.registerInquilino(dto);
  }

  @Post('register/corretor')
  async registerCorretor(
    @Body() dto: RegisterCorretorDto,
  ): Promise<AuthResponse> {
    return this.authService.registerCorretor(dto);
  }

  @Post('register/franqueado')
  async registerFranqueado(
    @Body() dto: RegisterFranqueadoDto,
  ): Promise<AuthResponse> {
    return this.authService.registerFranqueado(dto);
  }

  @Post('refresh')
  async refresh(@Body() dto: RefreshTokenDto): Promise<AuthResponse> {
    return this.authService.refreshTokens(dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Post('logout')
  @ApiOperation({ summary: 'Logout de usuário' })
  async logout(@CurrentUser() user: User) {
    await this.authService.logout(user.id);
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Get('me')
  @ApiOperation({ summary: 'Obter perfil do usuário autenticado' })
  async me(@CurrentUser() user: User) {
    return this.authService.getProfile(user.id);
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Solicitar recuperação de senha' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Redefinir senha com token' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Post('change-password')
  @ApiOperation({ summary: 'Alterar senha do usuário autenticado' })
  async changePassword(
    @CurrentUser() user: User,
    @Body() dto: UpdatePasswordDto,
  ) {
    await this.authService.changePassword(user.id, dto);
    return { success: true };
  }
}
