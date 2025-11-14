import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { ImobiliariaProfile } from './entities/imobiliaria-profile.entity';
import { InquilinoProfile } from './entities/inquilino-profile.entity';
import { CorretorProfile } from './entities/corretor-profile.entity';
import { UserRole } from '../../common/enums/user-role.enum';
import { UpdateUserDto } from './dto/update-user.dto';

interface CreateBaseUserPayload {
  email: string;
  passwordHash: string;
  fullName?: string;
  phone?: string;
  role: UserRole;
}

interface ImobiliariaProfilePayload {
  companyName: string;
  cnpj: string;
  creci?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
}

interface InquilinoProfilePayload {
  fullName: string;
  cpf: string;
  birthDate?: Date;
  phone?: string;
  monthlyIncome: number;
  hasNegativeRecords: boolean;
  employmentStatus?: string;
}

interface CorretorProfilePayload {
  fullName: string;
  cpf: string;
  creci?: string;
  phone?: string;
  brokerageName?: string;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(ImobiliariaProfile)
    private readonly imobiliariaRepository: Repository<ImobiliariaProfile>,
    @InjectRepository(InquilinoProfile)
    private readonly inquilinoRepository: Repository<InquilinoProfile>,
    @InjectRepository(CorretorProfile)
    private readonly corretorRepository: Repository<CorretorProfile>,
  ) {}

  async createBaseUser(payload: CreateBaseUserPayload): Promise<User> {
    const user = this.userRepository.create({
      email: payload.email.toLowerCase(),
      passwordHash: payload.passwordHash,
      role: payload.role,
      fullName: payload.fullName,
      phone: payload.phone,
    });
    return this.userRepository.save(user);
  }

  async attachImobiliariaProfile(
    user: User,
    profile: ImobiliariaProfilePayload,
  ): Promise<ImobiliariaProfile> {
    const entity = this.imobiliariaRepository.create({
      ...profile,
      user,
    });
    return this.imobiliariaRepository.save(entity);
  }

  async attachInquilinoProfile(
    user: User,
    profile: InquilinoProfilePayload,
  ): Promise<InquilinoProfile> {
    const entity = this.inquilinoRepository.create({
      ...profile,
      user,
    });
    return this.inquilinoRepository.save(entity);
  }

  async attachCorretorProfile(
    user: User,
    profile: CorretorProfilePayload,
  ): Promise<CorretorProfile> {
    const entity = this.corretorRepository.create({
      ...profile,
      user,
    });
    return this.corretorRepository.save(entity);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email: email.toLowerCase() },
    });
  }

  async findByPasswordResetToken(token: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { passwordResetToken: token },
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id },
    });
  }

  async listUsers(role?: UserRole): Promise<User[]> {
    if (role) {
      return this.userRepository.find({
        where: { role },
      });
    }
    return this.userRepository.find();
  }

  async updateUser(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }
    user.fullName = dto.fullName ?? user.fullName;
    user.phone = dto.phone ?? user.phone;
    return this.userRepository.save(user);
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.userRepository.update(id, {
      lastLoginAt: new Date(),
    });
  }

  async setRefreshToken(
    userId: string,
    refreshTokenHash: string | null,
  ): Promise<void> {
    await this.userRepository.update(userId, {
      refreshTokenHash: refreshTokenHash ?? undefined,
    });
  }

  async setPasswordResetToken(
    userId: string,
    token: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.userRepository.update(userId, {
      passwordResetToken: token,
      passwordResetTokenExpiresAt: expiresAt,
    });
  }

  async clearPasswordResetToken(userId: string): Promise<void> {
    await this.userRepository.update(userId, {
      passwordResetToken: undefined,
      passwordResetTokenExpiresAt: undefined,
    });
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await this.userRepository.update(userId, {
      passwordHash,
      passwordResetToken: undefined,
      passwordResetTokenExpiresAt: undefined,
    });
  }

  async isCnpjInUse(cnpj: string): Promise<boolean> {
    const existing = await this.imobiliariaRepository.findOne({
      where: { cnpj },
    });
    return !!existing;
  }

  async isCpfInUse(cpf: string): Promise<boolean> {
    const [inquilino, corretor] = await Promise.all([
      this.inquilinoRepository.findOne({ where: { cpf } }),
      this.corretorRepository.findOne({ where: { cpf } }),
    ]);
    return Boolean(inquilino ?? corretor);
  }

  sanitizeUser(user: User): Omit<User, 'passwordHash' | 'refreshTokenHash'> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, refreshTokenHash, ...rest } = user;
    return rest;
  }
}
