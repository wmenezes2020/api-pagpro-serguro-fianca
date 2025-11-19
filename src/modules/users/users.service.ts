import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { hash } from 'bcrypt';
import { User } from './entities/user.entity';
import { ImobiliariaProfile } from './entities/imobiliaria-profile.entity';
import { InquilinoProfile } from './entities/inquilino-profile.entity';
import { CorretorProfile } from './entities/corretor-profile.entity';
import { FranqueadoProfile } from './entities/franqueado-profile.entity';
import { UserRole } from '../../common/enums/user-role.enum';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateFranqueadoDto } from './dto/create-franqueado.dto';
import { CreateImobiliariaDto } from './dto/create-imobiliaria.dto';

interface CreateBaseUserPayload {
  email: string;
  passwordHash: string;
  fullName?: string;
  phone?: string;
  role: UserRole;
  parent?: User | null;
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

interface FranqueadoProfilePayload {
  companyName: string;
  document?: string;
  region?: string;
  notes?: string;
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
    @InjectRepository(FranqueadoProfile)
    private readonly franqueadoRepository: Repository<FranqueadoProfile>,
  ) {}

  async createBaseUser(payload: CreateBaseUserPayload): Promise<User> {
    const user = this.userRepository.create({
      email: payload.email.toLowerCase(),
      passwordHash: payload.passwordHash,
      role: payload.role,
      fullName: payload.fullName,
      phone: payload.phone,
      parent: payload.parent ?? undefined,
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

  async attachFranqueadoProfile(
    user: User,
    profile: FranqueadoProfilePayload,
  ): Promise<FranqueadoProfile> {
    const entity = this.franqueadoRepository.create({
      ...profile,
      user,
    });
    return this.franqueadoRepository.save(entity);
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
      relations: ['parent'],
    });
  }

  async listUsers(role?: UserRole): Promise<User[]> {
    if (role) {
      return this.userRepository.find({
        where: { role },
        relations: ['parent', 'franqueadoProfile', 'imobiliariaProfile', 'corretorProfile', 'inquilinoProfile'],
      });
    }
    return this.userRepository.find({
      relations: ['parent', 'franqueadoProfile', 'imobiliariaProfile', 'corretorProfile', 'inquilinoProfile'],
    });
  }

  async listChildren(parentId: string, role?: UserRole): Promise<User[]> {
    const where: any = { parent: { id: parentId } };
    if (role) {
      where.role = role;
    }
    return this.userRepository.find({
      where,
      relations: ['parent', 'franqueadoProfile', 'imobiliariaProfile', 'corretorProfile', 'inquilinoProfile'],
    });
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

  async createFranqueadoChild(
    parent: User,
    dto: CreateFranqueadoDto,
  ): Promise<User> {
    const existingEmail = await this.findByEmail(dto.email);
    if (existingEmail) {
      throw new ConflictException('E-mail já está cadastrado.');
    }

    const passwordHash = await hash(dto.password, 10);
    const user = await this.createBaseUser({
      email: dto.email,
      passwordHash,
      role: UserRole.FRANQUEADO,
      fullName: dto.fullName,
      phone: dto.phone,
      parent,
    });

    await this.attachFranqueadoProfile(user, {
      companyName: dto.companyName,
      document: dto.document,
      region: dto.region,
      notes: dto.notes,
    });

    const created = await this.findById(user.id);
    if (!created) {
      throw new NotFoundException('Não foi possível carregar o franqueado.');
    }
    return created;
  }

  async createImobiliariaChild(
    parent: User,
    dto: CreateImobiliariaDto,
  ): Promise<User> {
    const existingEmail = await this.findByEmail(dto.email);
    if (existingEmail) {
      throw new ConflictException('E-mail já está cadastrado.');
    }

    const cnpjInUse = await this.isCnpjInUse(dto.cnpj);
    if (cnpjInUse) {
      throw new ConflictException('CNPJ já está cadastrado.');
    }

    const passwordHash = await hash(dto.password, 10);
    const user = await this.createBaseUser({
      email: dto.email,
      passwordHash,
      role: UserRole.IMOBILIARIA,
      fullName: dto.fullName,
      phone: dto.phone,
      parent,
    });

    await this.attachImobiliariaProfile(user, {
      companyName: dto.companyName,
      cnpj: dto.cnpj,
      creci: dto.creci,
      website: dto.website,
      address: dto.address,
      city: dto.city,
      state: dto.state,
      postalCode: dto.postalCode,
    });

    const created = await this.findById(user.id);
    if (!created) {
      throw new NotFoundException('Não foi possível carregar a imobiliária.');
    }
    return created;
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

