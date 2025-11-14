import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SupportTicket } from './entities/support-ticket.entity';
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';
import { User } from '../users/entities/user.entity';
import { UpdateSupportTicketDto } from './dto/update-support-ticket.dto';
import { UsersService } from '../users/users.service';
import { UserRole } from '../../common/enums/user-role.enum';

@Injectable()
export class SupportService {
  constructor(
    @InjectRepository(SupportTicket)
    private readonly supportRepository: Repository<SupportTicket>,
    private readonly usersService: UsersService,
  ) {}

  async create(
    dto: CreateSupportTicketDto,
    user: User,
  ): Promise<SupportTicket> {
    const ticket = this.supportRepository.create({
      subject: dto.subject,
      message: dto.message,
      createdBy: user,
    });

    return this.supportRepository.save(ticket);
  }

  async findAll(user: User): Promise<SupportTicket[]> {
    if (user.role === UserRole.ADMIN) {
      return this.supportRepository.find({
        order: { createdAt: 'DESC' },
      });
    }

    return this.supportRepository.find({
      where: { createdBy: { id: user.id } },
      order: { createdAt: 'DESC' },
    });
  }

  async update(
    id: string,
    dto: UpdateSupportTicketDto,
    user: User,
  ): Promise<SupportTicket> {
    const ticket = await this.supportRepository.findOne({
      where: { id },
      relations: ['createdBy', 'assignedTo'],
    });

    if (!ticket) {
      throw new NotFoundException('Chamado não encontrado.');
    }

    if (user.role !== UserRole.ADMIN && ticket.createdBy.id !== user.id) {
      throw new ForbiddenException('Você não pode alterar este chamado.');
    }

    if (dto.status) {
      ticket.status = dto.status;
    }

    if (dto.assignedToId) {
      const assignee = await this.usersService.findById(dto.assignedToId);
      if (!assignee) {
        throw new NotFoundException('Usuário para atribuição não encontrado.');
      }
      ticket.assignedTo = assignee;
    }

    if (dto.message) {
      ticket.message = `${ticket.message}\n\nAtualização: ${dto.message}`;
    }

    await this.supportRepository.save(ticket);
    return ticket;
  }
}
