import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ImobiliariaClient } from './entities/imobiliaria-client.entity';
import { CreateImobiliariaClientDto } from './dto/create-imobiliaria-client.dto';
import { UpdateImobiliariaClientDto } from './dto/update-imobiliaria-client.dto';
import { User } from '../users/entities/user.entity';
import { ClientStatus } from '../../common/enums/client-status.enum';

interface ListClientsParams {
  ownerId: string;
  status?: ClientStatus;
  search?: string;
}

@Injectable()
export class ImobiliariaClientsService {
  constructor(
    @InjectRepository(ImobiliariaClient)
    private readonly repository: Repository<ImobiliariaClient>,
  ) {}

  async create(
    dto: CreateImobiliariaClientDto,
    owner: User,
  ): Promise<ImobiliariaClient> {
    const existing = await this.repository.findOne({
      where: {
        owner: { id: owner.id },
        document: dto.document,
      },
    });

    if (existing) {
      throw new ForbiddenException(
        'Já existe um cliente com este documento cadastrado na sua imobiliária.',
      );
    }

    const entity = this.repository.create({
      ...dto,
      owner,
    });
    return this.repository.save(entity);
  }

  async findAll({
    ownerId,
    status,
    search,
  }: ListClientsParams): Promise<ImobiliariaClient[]> {
    const query = this.repository
      .createQueryBuilder('client')
      .leftJoin('client.owner', 'owner')
      .where('owner.id = :ownerId', { ownerId })
      .orderBy('client.createdAt', 'DESC');

    if (status) {
      query.andWhere('client.status = :status', { status });
    }

    if (search) {
      query.andWhere(
        '(LOWER(client.fullName) LIKE :search OR client.document LIKE :searchExact)',
        {
          search: `%${search.toLowerCase()}%`,
          searchExact: `${search}%`,
        },
      );
    }

    return query.getMany();
  }

  async findOne(id: string, ownerId: string): Promise<ImobiliariaClient> {
    const client = await this.repository.findOne({
      where: { id, owner: { id: ownerId } },
    });
    if (!client) {
      throw new NotFoundException('Cliente não encontrado.');
    }
    return client;
  }

  async update(
    id: string,
    ownerId: string,
    dto: UpdateImobiliariaClientDto,
  ): Promise<ImobiliariaClient> {
    await this.findOne(id, ownerId);
    await this.repository.update({ id, owner: { id: ownerId } }, { ...dto });
    return this.findOne(id, ownerId);
  }

  async remove(id: string, ownerId: string): Promise<void> {
    const client = await this.findOne(id, ownerId);
    await this.repository.remove(client);
  }
}
