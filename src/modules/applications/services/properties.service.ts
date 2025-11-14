import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Property } from '../entities/property.entity';
import { CreatePropertyDto } from '../dto/create-property.dto';
import { UpdatePropertyDto } from '../dto/update-property.dto';
import { User } from '../../users/entities/user.entity';
import { UserRole } from '../../../common/enums/user-role.enum';

@Injectable()
export class PropertiesService {
  constructor(
    @InjectRepository(Property)
    private readonly propertyRepository: Repository<Property>,
  ) {}

  async create(dto: CreatePropertyDto, owner: User): Promise<Property> {
    if (![UserRole.IMOBILIARIA, UserRole.ADMIN].includes(owner.role)) {
      throw new ForbiddenException(
        'Somente imobiliárias podem cadastrar imóveis.',
      );
    }

    const property = this.propertyRepository.create({
      ...dto,
      owner,
    });

    return this.propertyRepository.save(property);
  }

  async findAll(): Promise<Property[]> {
    return this.propertyRepository.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<Property> {
    const property = await this.propertyRepository.findOne({ where: { id } });
    if (!property) {
      throw new NotFoundException('Imóvel não encontrado.');
    }
    return property;
  }

  async update(
    id: string,
    dto: UpdatePropertyDto,
    user: User,
  ): Promise<Property> {
    const property = await this.findOne(id);
    this.ensureOwnership(property, user);

    Object.assign(property, dto);
    return this.propertyRepository.save(property);
  }

  async remove(id: string, user: User): Promise<void> {
    const property = await this.findOne(id);
    this.ensureOwnership(property, user);
    await this.propertyRepository.delete(property.id);
  }

  private ensureOwnership(property: Property, user: User) {
    if (user.role === UserRole.ADMIN) {
      return;
    }
    if (property.owner.id !== user.id) {
      throw new ForbiddenException(
        'Você não tem permissão para alterar este imóvel.',
      );
    }
  }
}
