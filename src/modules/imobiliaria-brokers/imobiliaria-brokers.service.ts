import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ImobiliariaBroker } from './entities/imobiliaria-broker.entity';
import { CreateImobiliariaBrokerDto } from './dto/create-imobiliaria-broker.dto';
import { UpdateImobiliariaBrokerDto } from './dto/update-imobiliaria-broker.dto';
import { User } from '../users/entities/user.entity';
import { BrokerStatus } from '../../common/enums/broker-status.enum';

interface ListBrokersParams {
  ownerId: string;
  status?: BrokerStatus;
  search?: string;
}

@Injectable()
export class ImobiliariaBrokersService {
  constructor(
    @InjectRepository(ImobiliariaBroker)
    private readonly repository: Repository<ImobiliariaBroker>,
  ) {}

  async create(
    dto: CreateImobiliariaBrokerDto,
    owner: User,
  ): Promise<ImobiliariaBroker> {
    const existing = await this.repository.findOne({
      where: { owner: { id: owner.id }, cpf: dto.cpf },
    });

    if (existing) {
      throw new ForbiddenException(
        'Já existe um corretor com este CPF cadastrado.',
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
  }: ListBrokersParams): Promise<ImobiliariaBroker[]> {
    const query = this.repository
      .createQueryBuilder('broker')
      .leftJoin('broker.owner', 'owner')
      .where('owner.id = :ownerId', { ownerId })
      .orderBy('broker.createdAt', 'DESC');

    if (status) {
      query.andWhere('broker.status = :status', { status });
    }

    if (search) {
      query.andWhere(
        '(LOWER(broker.fullName) LIKE :search OR broker.cpf LIKE :searchExact OR LOWER(broker.creci) LIKE :search)',
        {
          search: `%${search.toLowerCase()}%`,
          searchExact: `${search}%`,
        },
      );
    }

    return query.getMany();
  }

  async findOne(id: string, ownerId: string): Promise<ImobiliariaBroker> {
    const broker = await this.repository.findOne({
      where: { id, owner: { id: ownerId } },
    });
    if (!broker) {
      throw new NotFoundException('Corretor não encontrado.');
    }
    return broker;
  }

  async update(
    id: string,
    ownerId: string,
    dto: UpdateImobiliariaBrokerDto,
  ): Promise<ImobiliariaBroker> {
    await this.findOne(id, ownerId);
    await this.repository.update({ id, owner: { id: ownerId } }, { ...dto });
    return this.findOne(id, ownerId);
  }

  async remove(id: string, ownerId: string): Promise<void> {
    const broker = await this.findOne(id, ownerId);
    await this.repository.remove(broker);
  }
}
