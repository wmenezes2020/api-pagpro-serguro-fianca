import {
  Body,
  Controller,
  Get,
  NotFoundException,
  ParseEnumPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../../common/enums/user-role.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from './entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateFranqueadoDto } from './dto/create-franqueado.dto';
import { CreateImobiliariaDto } from './dto/create-imobiliaria.dto';
import { CreateCorretorDto } from './dto/create-corretor.dto';
import { CreateInquilinoDto } from './dto/create-inquilino.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getProfile(@CurrentUser() user: User) {
    const current = await this.usersService.findById(user.id);
    if (!current) {
      throw new NotFoundException('Usuário não encontrado.');
    }
    return this.usersService.sanitizeUser(current);
  }

  @Patch('me')
  async updateProfile(@CurrentUser() user: User, @Body() dto: UpdateUserDto) {
    const updated = await this.usersService.updateUser(user.id, dto);
    return this.usersService.sanitizeUser(updated);
  }

  @Get()
  async listUsers(
    @CurrentUser() currentUser: User,
    @Query('role', new ParseEnumPipe(UserRole, { optional: true }))
    role?: UserRole,
  ) {
    // ADMIN pode listar todos os usuários
    if (currentUser.role === UserRole.ADMIN) {
      const users = await this.usersService.listUsers(role);
      return users.map((user) => this.usersService.sanitizeUser(user));
    }

    const hierarchyPermissions: Partial<Record<UserRole, UserRole[]>> = {
      [UserRole.DIRECTOR]: [
        UserRole.FRANQUEADO,
        UserRole.IMOBILIARIA,
        UserRole.CORRETOR,
      ],
      [UserRole.FRANQUEADO]: [UserRole.IMOBILIARIA, UserRole.CORRETOR],
      [UserRole.IMOBILIARIA]: [UserRole.CORRETOR, UserRole.INQUILINO],
      [UserRole.CORRETOR]: [UserRole.INQUILINO],
    };

    const allowedRoles = hierarchyPermissions[currentUser.role];
    if (!allowedRoles) {
      return [];
    }

    if (role && !allowedRoles.includes(role)) {
      return [];
    }

    const users = await this.usersService.listChildren(currentUser.id, role);
    return users.map((user) => this.usersService.sanitizeUser(user));
  }

  @Post('franqueados')
  @Roles(UserRole.ADMIN, UserRole.DIRECTOR)
  async createFranqueado(
    @CurrentUser() currentUser: User,
    @Body() dto: CreateFranqueadoDto,
  ) {
    const created = await this.usersService.createFranqueadoChild(
      currentUser,
      dto,
    );
    return this.usersService.sanitizeUser(created);
  }

  @Post('imobiliarias')
  @Roles(UserRole.ADMIN, UserRole.DIRECTOR, UserRole.FRANQUEADO)
  async createImobiliaria(
    @CurrentUser() currentUser: User,
    @Body() dto: CreateImobiliariaDto,
  ) {
    const created = await this.usersService.createImobiliariaChild(
      currentUser,
      dto,
    );
    return this.usersService.sanitizeUser(created);
  }

  @Post('corretores')
  @Roles(UserRole.ADMIN, UserRole.DIRECTOR, UserRole.FRANQUEADO)
  async createCorretor(
    @CurrentUser() currentUser: User,
    @Body() dto: CreateCorretorDto,
  ) {
    const created = await this.usersService.createCorretorChild(
      currentUser,
      dto,
    );
    return this.usersService.sanitizeUser(created);
  }

  @Post('inquilinos')
  @Roles(UserRole.ADMIN, UserRole.DIRECTOR, UserRole.FRANQUEADO, UserRole.IMOBILIARIA, UserRole.CORRETOR)
  async createInquilino(
    @CurrentUser() currentUser: User,
    @Body() dto: CreateInquilinoDto,
  ) {
    const created = await this.usersService.createInquilinoChild(
      currentUser,
      dto,
    );
    return this.usersService.sanitizeUser(created);
  }
}
