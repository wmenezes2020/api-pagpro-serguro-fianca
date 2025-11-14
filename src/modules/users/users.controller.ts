import {
  Body,
  Controller,
  Get,
  NotFoundException,
  ParseEnumPipe,
  Patch,
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

    // IMOBILIARIA pode listar apenas INQUILINO e CORRETOR
    if (currentUser.role === UserRole.IMOBILIARIA) {
      // Se role especificado, deve ser INQUILINO ou CORRETOR
      if (role && ![UserRole.INQUILINO, UserRole.CORRETOR].includes(role)) {
        return [];
      }
      // Se não especificado, retorna ambos
      const users = await this.usersService.listUsers(role);
      return users.map((user) => this.usersService.sanitizeUser(user));
    }

    // Outros roles não têm permissão
    return [];
  }
}
