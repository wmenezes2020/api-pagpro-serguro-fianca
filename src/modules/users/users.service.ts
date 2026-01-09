import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { hash } from 'bcrypt';
import { randomUUID } from 'crypto';
import { User } from './entities/user.entity';
import { ImobiliariaProfile } from './entities/imobiliaria-profile.entity';
import { InquilinoProfile } from './entities/inquilino-profile.entity';
import { CorretorProfile } from './entities/corretor-profile.entity';
import { FranqueadoProfile } from './entities/franqueado-profile.entity';
import { UserRole } from '../../common/enums/user-role.enum';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateFranqueadoDto } from './dto/create-franqueado.dto';
import { CreateImobiliariaDto } from './dto/create-imobiliaria.dto';
import { CreateCorretorDto } from './dto/create-corretor.dto';
import { CreateInquilinoDto } from './dto/create-inquilino.dto';

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
    const normalizedEmail = email.toLowerCase();
    
    // Usa query SQL direta para garantir que pegamos o ID do banco
    const rawResult = await this.userRepository.query(
      `SELECT id, email, passwordHash, fullName, phone, role, isActive, 
              refreshTokenHash, passwordResetToken, passwordResetTokenExpiresAt, 
              lastLoginAt, createdAt, updatedAt, parent_user_id
       FROM cliente_psf_users 
       WHERE email = ? 
       LIMIT 1`,
      [normalizedEmail],
    );
    
    if (!rawResult || rawResult.length === 0) {
      return null;
    }
    
    const row = rawResult[0];
    
    // Verifica se o ID é válido
    if (!row.id || row.id === '' || row.id.trim() === '') {
      console.error('❌ CRÍTICO: Usuário encontrado sem ID válido no banco:', {
        email: normalizedEmail,
        role: row.role,
      });
      
      // Tenta corrigir automaticamente gerando um UUID
      try {
        const newId = randomUUID();
        
        await this.userRepository.query(
          `UPDATE cliente_psf_users SET id = ? WHERE email = ?`,
          [newId, normalizedEmail],
        );
        
        console.log('✅ ID corrigido automaticamente para usuário:', normalizedEmail);
        row.id = newId;
      } catch (error) {
        console.error('❌ Erro ao corrigir ID do usuário:', error);
        return null;
      }
    }
    
    // Constrói o objeto User a partir do resultado raw
    const user = this.userRepository.create({
      id: row.id,
      email: row.email,
      passwordHash: row.passwordHash,
      fullName: row.fullName,
      phone: row.phone,
      role: row.role,
      isActive: row.isActive === 1 || row.isActive === true,
      refreshTokenHash: row.refreshTokenHash,
      passwordResetToken: row.passwordResetToken,
      passwordResetTokenExpiresAt: row.passwordResetTokenExpiresAt
        ? new Date(row.passwordResetTokenExpiresAt)
        : undefined,
      lastLoginAt: row.lastLoginAt ? new Date(row.lastLoginAt) : undefined,
      createdAt: row.createdAt ? new Date(row.createdAt) : new Date(),
      updatedAt: row.updatedAt ? new Date(row.updatedAt) : new Date(),
    });
    
    // Se tem parent_user_id, carrega o parent
    if (row.parent_user_id) {
      const parent = await this.findById(row.parent_user_id);
      if (parent) {
        user.parent = parent;
      }
    }
    
    return user;
  }

  async findByPasswordResetToken(token: string): Promise<User | null> {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .select([
        'user.id',
        'user.email',
        'user.passwordHash',
        'user.fullName',
        'user.phone',
        'user.role',
        'user.isActive',
        'user.passwordResetToken',
        'user.passwordResetTokenExpiresAt',
      ])
      .where('user.passwordResetToken = :token', { token })
      .getOne();
    return user;
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
        relations: [
          'parent',
          'franqueadoProfile',
          'imobiliariaProfile',
          'corretorProfile',
          'inquilinoProfile',
        ],
      });
    }
    return this.userRepository.find({
      relations: [
        'parent',
        'franqueadoProfile',
        'imobiliariaProfile',
        'corretorProfile',
        'inquilinoProfile',
      ],
    });
  }

  async listChildren(parentId: string, role?: UserRole): Promise<User[]> {
    const where: any = { parent: { id: parentId } };
    if (role) {
      where.role = role;
    }
    return this.userRepository.find({
      where,
      relations: [
        'parent',
        'franqueadoProfile',
        'imobiliariaProfile',
        'corretorProfile',
        'inquilinoProfile',
      ],
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
    if (!id) {
      throw new Error('User ID is required to update last login');
    }
    await this.userRepository.update({ id }, {
      lastLoginAt: new Date(),
    });
  }

  async setRefreshToken(
    userId: string,
    refreshTokenHash: string | null,
  ): Promise<void> {
    if (!userId) {
      throw new Error('User ID is required to set refresh token');
    }
    await this.userRepository.update({ id: userId }, {
      refreshTokenHash,
    });
  }

  async setPasswordResetToken(
    userId: string,
    token: string,
    expiresAt: Date,
  ): Promise<void> {
    if (!userId) {
      throw new Error('User ID is required to set password reset token');
    }
    await this.userRepository.update({ id: userId }, {
      passwordResetToken: token,
      passwordResetTokenExpiresAt: expiresAt,
    });
  }

  async clearPasswordResetToken(userId: string): Promise<void> {
    if (!userId) {
      throw new Error('User ID is required to clear password reset token');
    }
    await this.userRepository.update({ id: userId }, {
      passwordResetToken: undefined,
      passwordResetTokenExpiresAt: undefined,
    });
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    if (!userId) {
      throw new Error('User ID is required to update password');
    }
    await this.userRepository.update({ id: userId }, {
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

  async createCorretorChild(
    parent: User,
    dto: CreateCorretorDto,
  ): Promise<User> {
    const existingEmail = await this.findByEmail(dto.email);
    if (existingEmail) {
      throw new ConflictException('E-mail já está cadastrado.');
    }

    if (await this.isCpfInUse(dto.cpf)) {
      throw new ConflictException('CPF já está cadastrado.');
    }

    const passwordHash = await hash(dto.password, 10);
    const user = await this.createBaseUser({
      email: dto.email,
      passwordHash,
      role: UserRole.CORRETOR,
      fullName: dto.fullName,
      phone: dto.phone,
      parent,
    });

    await this.attachCorretorProfile(user, {
      fullName: dto.fullName,
      cpf: dto.cpf,
      creci: dto.creci,
      phone: dto.phone,
      brokerageName: dto.brokerageName,
    });

    const created = await this.findById(user.id);
    if (!created) {
      throw new NotFoundException('Não foi possível carregar o corretor.');
    }
    return created;
  }

  async createInquilinoChild(
    parent: User,
    dto: CreateInquilinoDto,
  ): Promise<User> {
    const existingEmail = await this.findByEmail(dto.email);
    if (existingEmail) {
      throw new ConflictException('E-mail já está cadastrado.');
    }

    if (await this.isCpfInUse(dto.cpf)) {
      throw new ConflictException('CPF já está cadastrado.');
    }

    const passwordHash = await hash(dto.password, 10);
    const user = await this.createBaseUser({
      email: dto.email,
      passwordHash,
      role: UserRole.INQUILINO,
      fullName: dto.fullName,
      phone: dto.phone,
      parent,
    });

    await this.attachInquilinoProfile(user, {
      fullName: dto.fullName,
      cpf: dto.cpf,
      birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
      phone: dto.phone,
      monthlyIncome: dto.monthlyIncome ?? 0,
      hasNegativeRecords: false,
      employmentStatus: dto.employmentStatus,
    });

    const created = await this.findById(user.id);
    if (!created) {
      throw new NotFoundException('Não foi possível carregar o inquilino.');
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
