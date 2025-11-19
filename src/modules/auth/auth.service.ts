import {
  ConflictException,
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { hash, compare } from 'bcrypt';
import { randomBytes } from 'crypto';
import { UsersService } from '../users/users.service';
import { RegisterImobiliariaDto } from './dto/register-imobiliaria.dto';
import { RegisterInquilinoDto } from './dto/register-inquilino.dto';
import { RegisterCorretorDto } from './dto/register-corretor.dto';
import { RegisterFranqueadoDto } from './dto/register-franqueado.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../../common/enums/user-role.enum';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { PartnerLinksService } from '../partner-links/partner-links.service';
import { PartnerLink } from '../partner-links/entities/partner-link.entity';
import { UpdatePasswordDto } from './dto/update-password.dto';

export interface TokenPayload {
  sub: string;
  role: UserRole;
  email: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  tokens: AuthTokens;
  user: unknown;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly partnerLinksService: PartnerLinksService,
  ) {}

  async validateUser(email: string, password: string): Promise<User> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException(
        'Credenciais inválidas. Verifique seu email e senha.',
      );
    }

    if (!user.isActive) {
      throw new UnauthorizedException(
        'Conta desativada. Entre em contato com o suporte.',
      );
    }

    const isPasswordValid = await compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException(
        'Credenciais inválidas. Verifique seu email e senha.',
      );
    }

    return user;
  }

  async login(user: User): Promise<AuthResponse> {
    await this.usersService.updateLastLogin(user.id);
    const tokens = await this.generateTokens(user);
    await this.usersService.setRefreshToken(
      user.id,
      await hash(tokens.refreshToken, 10),
    );
    return {
      tokens,
      user: this.usersService.sanitizeUser(user),
    };
  }

  async registerImobiliaria(
    dto: RegisterImobiliariaDto,
  ): Promise<AuthResponse> {
    await this.ensureEmailIsAvailable(dto.email);
    if (await this.usersService.isCnpjInUse(dto.cnpj)) {
      throw new ConflictException('CNPJ já está cadastrado em outra conta.');
    }

    const invite = await this.resolveInvite(
      dto.inviteToken,
      UserRole.IMOBILIARIA,
    );
    const parent = await this.usersService.findById(invite.createdBy.id);
    if (!parent) {
      await this.partnerLinksService.releaseInvite(invite);
      throw new BadRequestException('Convite inválido.');
    }

    try {
      const passwordHash = await hash(dto.password, 10);
      const user = await this.usersService.createBaseUser({
        email: dto.email,
        passwordHash,
        role: UserRole.IMOBILIARIA,
        fullName: dto.fullName,
        phone: dto.phone,
        parent,
      });

      await this.usersService.attachImobiliariaProfile(user, {
        companyName: dto.companyName,
        cnpj: dto.cnpj,
        creci: dto.creci,
        website: dto.website,
        address: dto.address,
        city: dto.city,
        state: dto.state,
        postalCode: dto.postalCode,
      });

      const hydratedUser = await this.loadUserOrFail(user.id);
      return this.login(hydratedUser);
    } catch (error) {
      await this.partnerLinksService.releaseInvite(invite);
      throw error;
    }
  }

  async registerInquilino(dto: RegisterInquilinoDto): Promise<AuthResponse> {
    await this.ensureEmailIsAvailable(dto.email);
    if (await this.usersService.isCpfInUse(dto.cpf)) {
      throw new ConflictException('CPF já está cadastrado em outra conta.');
    }

    const invite = await this.resolveInvite(
      dto.inviteToken,
      UserRole.INQUILINO,
    );
    const parent = await this.usersService.findById(invite.createdBy.id);
    if (!parent) {
      await this.partnerLinksService.releaseInvite(invite);
      throw new BadRequestException('Convite inválido.');
    }

    try {
      const passwordHash = await hash(dto.password, 10);
      const user = await this.usersService.createBaseUser({
        email: dto.email,
        passwordHash,
        role: UserRole.INQUILINO,
        fullName: dto.fullName,
        phone: dto.phone,
        parent,
      });

      await this.usersService.attachInquilinoProfile(user, {
        fullName: dto.fullName,
        cpf: dto.cpf,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
        phone: dto.phone,
        monthlyIncome: dto.monthlyIncome,
        hasNegativeRecords: dto.hasNegativeRecords,
        employmentStatus: dto.employmentStatus,
      });

      const hydratedUser = await this.loadUserOrFail(user.id);
      return this.login(hydratedUser);
    } catch (error) {
      await this.partnerLinksService.releaseInvite(invite);
      throw error;
    }
  }

  async registerCorretor(dto: RegisterCorretorDto): Promise<AuthResponse> {
    await this.ensureEmailIsAvailable(dto.email);
    if (await this.usersService.isCpfInUse(dto.cpf)) {
      throw new ConflictException('CPF já está cadastrado em outra conta.');
    }

    const invite = await this.resolveInvite(dto.inviteToken, UserRole.CORRETOR);
    const parent = await this.usersService.findById(invite.createdBy.id);
    if (!parent) {
      await this.partnerLinksService.releaseInvite(invite);
      throw new BadRequestException('Convite inválido.');
    }

    try {
      const passwordHash = await hash(dto.password, 10);
      const user = await this.usersService.createBaseUser({
        email: dto.email,
        passwordHash,
        role: UserRole.CORRETOR,
        fullName: dto.fullName,
        phone: dto.phone,
        parent,
      });

      await this.usersService.attachCorretorProfile(user, {
        fullName: dto.fullName,
        cpf: dto.cpf,
        creci: dto.creci,
        phone: dto.phone,
        brokerageName: dto.brokerageName,
      });

      const hydratedUser = await this.loadUserOrFail(user.id);
      return this.login(hydratedUser);
    } catch (error) {
      await this.partnerLinksService.releaseInvite(invite);
      throw error;
    }
  }

  async registerFranqueado(
    dto: RegisterFranqueadoDto,
  ): Promise<AuthResponse> {
    await this.ensureEmailIsAvailable(dto.email);

    const invite = await this.resolveInvite(
      dto.inviteToken,
      UserRole.FRANQUEADO,
    );
    const parent = await this.usersService.findById(invite.createdBy.id);
    if (!parent) {
      await this.partnerLinksService.releaseInvite(invite);
      throw new BadRequestException('Convite inválido.');
    }

    try {
      const passwordHash = await hash(dto.password, 10);
      const user = await this.usersService.createBaseUser({
        email: dto.email,
        passwordHash,
        role: UserRole.FRANQUEADO,
        fullName: dto.fullName,
        phone: dto.phone,
        parent,
      });

      await this.usersService.attachFranqueadoProfile(user, {
        companyName: dto.companyName,
        document: dto.document,
        region: dto.region,
        notes: dto.notes,
      });

      const hydratedUser = await this.loadUserOrFail(user.id);
      return this.login(hydratedUser);
    } catch (error) {
      await this.partnerLinksService.releaseInvite(invite);
      throw error;
    }
  }

  async refreshTokens(dto: RefreshTokenDto): Promise<AuthResponse> {
    try {
      const payload = await this.jwtService.verifyAsync<TokenPayload>(
        dto.refreshToken,
        {
          secret: this.configService.getOrThrow<string>(
            'app.jwt.refreshTokenSecret',
          ),
        },
      );

      const user = await this.usersService.findById(payload.sub);
      if (!user || !user.refreshTokenHash) {
        throw new UnauthorizedException('Token de atualização inválido.');
      }

      const isValid = await compare(dto.refreshToken, user.refreshTokenHash);
      if (!isValid) {
        throw new UnauthorizedException('Token de atualização inválido.');
      }

      const tokens = await this.generateTokens(user);
      await this.usersService.setRefreshToken(
        user.id,
        await hash(tokens.refreshToken, 10),
      );

      return {
        tokens,
        user: this.usersService.sanitizeUser(user),
      };
    } catch {
      throw new UnauthorizedException('Token de atualização inválido.');
    }
  }

  async logout(userId: string): Promise<void> {
    await this.usersService.setRefreshToken(userId, null);
  }

  async getProfile(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado.');
    }
    return this.usersService.sanitizeUser(user);
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ success: boolean }> {
    const user = await this.usersService.findByEmail(dto.email);

    // Por segurança, sempre retornamos sucesso mesmo se o email não existir
    if (!user) {
      return { success: true };
    }

    const resetToken = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // Token válido por 1 hora

    await this.usersService.setPasswordResetToken(
      user.id,
      resetToken,
      expiresAt,
    );

    // TODO: Integrar com serviço de email real (SendGrid, AWS SES, etc.)
    const resetUrl = `${this.configService.get<string>(
      'app.frontendUrl',
    )}/reset-password?token=${resetToken}`;

    // Placeholder: Em produção, enviar email aqui
    console.log(`Password reset link for ${user.email}: ${resetUrl}`);

    return { success: true };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ success: boolean }> {
    const user = await this.usersService.findByPasswordResetToken(dto.token);

    if (!user) {
      throw new BadRequestException('Token de recuperação inválido.');
    }

    if (
      !user.passwordResetTokenExpiresAt ||
      user.passwordResetTokenExpiresAt < new Date()
    ) {
      throw new BadRequestException('Token de recuperação expirado.');
    }

    const passwordHash = await hash(dto.newPassword, 10);
    await this.usersService.updatePassword(user.id, passwordHash);

    return { success: true };
  }

  async changePassword(
    userId: string,
    dto: UpdatePasswordDto,
  ): Promise<void> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado.');
    }

    const isValid = await compare(dto.currentPassword, user.passwordHash);
    if (!isValid) {
      throw new BadRequestException('Senha atual inválida.');
    }

    const newHash = await hash(dto.newPassword, 10);
    await this.usersService.updatePassword(user.id, newHash);
  }

  private async resolveInvite(token: string, role: UserRole) {
    if (!token) {
      throw new BadRequestException(
        'Convite inválido. Solicite um novo link ao responsável.',
      );
    }
    return this.partnerLinksService.consumeInvite(token, role);
  }

  private async generateTokens(user: User): Promise<AuthTokens> {
    const payload: TokenPayload = {
      sub: user.id,
      role: user.role,
      email: user.email,
    };

    const accessSecret = this.configService.getOrThrow<string>(
      'app.jwt.accessTokenSecret',
    );
    const refreshSecret = this.configService.getOrThrow<string>(
      'app.jwt.refreshTokenSecret',
    );
    const accessTtl = this.parseDuration(
      this.configService.getOrThrow<string>('app.jwt.accessTokenTtl'),
    );
    const refreshTtl = this.parseDuration(
      this.configService.getOrThrow<string>('app.jwt.refreshTokenTtl'),
    );

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: accessSecret,
        expiresIn: accessTtl,
      }),
      this.jwtService.signAsync(payload, {
        secret: refreshSecret,
        expiresIn: refreshTtl,
      }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  private async ensureEmailIsAvailable(email: string): Promise<void> {
    const existing = await this.usersService.findByEmail(email);
    if (existing) {
      throw new ConflictException('E-mail já está em uso.');
    }
  }

  private async loadUserOrFail(userId: string): Promise<User> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Não foi possível carregar o usuário.');
    }
    return user;
  }

  private parseDuration(value: string): number {
    if (!value) {
      return 0;
    }

    const numeric = Number(value);
    if (!Number.isNaN(numeric)) {
      return numeric;
    }

    const match = value
      .trim()
      .toLowerCase()
      .match(/^(\d+)([smhd])$/);
    if (!match) {
      throw new Error(`Formato inválido de duração: ${value}`);
    }

    const amount = Number(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's':
        return amount;
      case 'm':
        return amount * 60;
      case 'h':
        return amount * 60 * 60;
      case 'd':
        return amount * 60 * 60 * 24;
      default:
        throw new Error(`Unidade de duração não suportada: ${unit}`);
    }
  }
}
