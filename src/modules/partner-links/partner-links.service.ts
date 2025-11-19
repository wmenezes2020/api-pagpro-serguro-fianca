import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { PartnerLink } from './entities/partner-link.entity';
import { CreatePartnerLinkDto } from './dto/create-partner-link.dto';
import { UpdatePartnerLinkDto } from './dto/update-partner-link.dto';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../../common/enums/user-role.enum';

const INVITE_PERMISSIONS: Record<UserRole, UserRole[]> = {
  [UserRole.ADMIN]: [
    UserRole.DIRECTOR,
    UserRole.FRANQUEADO,
    UserRole.IMOBILIARIA,
    UserRole.CORRETOR,
    UserRole.INQUILINO,
  ],
  [UserRole.DIRECTOR]: [
    UserRole.FRANQUEADO,
    UserRole.IMOBILIARIA,
    UserRole.CORRETOR,
  ],
  [UserRole.FRANQUEADO]: [UserRole.IMOBILIARIA, UserRole.CORRETOR],
  [UserRole.IMOBILIARIA]: [UserRole.CORRETOR, UserRole.INQUILINO],
  [UserRole.CORRETOR]: [UserRole.INQUILINO],
  [UserRole.INQUILINO]: [UserRole.INQUILINO],
};

@Injectable()
export class PartnerLinksService {
  constructor(
    @InjectRepository(PartnerLink)
    private readonly partnerLinksRepository: Repository<PartnerLink>,
  ) {}

  async createLink(
    issuer: User,
    dto: CreatePartnerLinkDto,
  ): Promise<PartnerLink> {
    if (!this.canInvite(issuer.role, dto.targetRole)) {
      throw new ForbiddenException(
        'Você não possui permissão para criar convites para este perfil.',
      );
    }

    const token = randomBytes(24).toString('hex');
    const link = this.partnerLinksRepository.create({
      token,
      targetRole: dto.targetRole,
      createdBy: issuer,
      maxUses: dto.maxUses ?? 1,
      expiresAt: dto.expiresAt
        ? new Date(dto.expiresAt + 'T23:59:59-03:00')
        : undefined,
      notes: dto.notes,
    });
    return this.partnerLinksRepository.save(link);
  }

  async updateLink(
    linkId: string,
    issuerId: string,
    dto: UpdatePartnerLinkDto,
  ): Promise<PartnerLink> {
    const link = await this.partnerLinksRepository.findOne({
      where: { id: linkId },
      relations: ['createdBy'],
    });

    if (!link) {
      throw new NotFoundException('Convite não encontrado.');
    }

    if (link.createdBy.id !== issuerId) {
      throw new ForbiddenException(
        'Você não possui permissão para editar este convite.',
      );
    }

    if (link.usedCount > 0) {
      throw new BadRequestException(
        'Não é possível editar convites que já foram utilizados.',
      );
    }

    if (dto.targetRole && !this.canInvite(link.createdBy.role, dto.targetRole)) {
      throw new ForbiddenException(
        'Você não possui permissão para criar convites para este perfil.',
      );
    }

    if (dto.targetRole) {
      link.targetRole = dto.targetRole;
    }
    if (dto.maxUses !== undefined) {
      link.maxUses = dto.maxUses;
    }
    if (dto.expiresAt !== undefined) {
      link.expiresAt = dto.expiresAt
        ? new Date(dto.expiresAt + 'T23:59:59-03:00')
        : undefined;
    }
    if (dto.notes !== undefined) {
      link.notes = dto.notes;
    }
    if (dto.isActive !== undefined) {
      link.isActive = dto.isActive;
    }

    return this.partnerLinksRepository.save(link);
  }

  async listByCreator(userId: string): Promise<PartnerLink[]> {
    return this.partnerLinksRepository.find({
      where: { createdBy: { id: userId } },
      order: { createdAt: 'DESC' },
    });
  }

  async getPublicDetails(token: string) {
    const link = await this.partnerLinksRepository.findOne({
      where: { token },
      relations: ['createdBy'],
    });

    if (!link || !link.isActive) {
      throw new NotFoundException('Convite não encontrado ou expirado.');
    }

    if (link.expiresAt && link.expiresAt < new Date()) {
      throw new NotFoundException('Convite expirado.');
    }

    return {
      token: link.token,
      targetRole: link.targetRole,
      issuer: {
        id: link.createdBy.id,
        name: link.createdBy.fullName ?? link.createdBy.email,
        role: link.createdBy.role,
      },
      expiresAt: link.expiresAt,
      maxUses: link.maxUses,
      remainingUses: Math.max(link.maxUses - link.usedCount, 0),
      notes: link.notes,
    };
  }

  async consumeInvite(token: string, expectedRole: UserRole): Promise<PartnerLink> {
    const link = await this.partnerLinksRepository.findOne({
      where: { token },
      relations: ['createdBy'],
    });

    if (!link || !link.isActive) {
      throw new BadRequestException('Convite inválido ou inativo.');
    }

    if (link.targetRole !== expectedRole) {
      throw new BadRequestException(
        'Este convite não corresponde ao perfil solicitado.',
      );
    }

    if (link.expiresAt && link.expiresAt < new Date()) {
      throw new BadRequestException('Convite expirado.');
    }

    if (link.usedCount >= link.maxUses) {
      throw new BadRequestException('Este convite já atingiu o limite de uso.');
    }

    link.usedCount += 1;
    if (link.usedCount >= link.maxUses) {
      link.isActive = false;
    }
    await this.partnerLinksRepository.save(link);
    return link;
  }

  async releaseInvite(link: PartnerLink): Promise<void> {
    if (!link) {
      return;
    }
    const entity = await this.partnerLinksRepository.findOne({
      where: { id: link.id },
    });
    if (!entity) {
      return;
    }
    if (entity.usedCount > 0) {
      entity.usedCount -= 1;
    }
    entity.isActive = true;
    await this.partnerLinksRepository.save(entity);
  }

  private canInvite(
    issuerRole: UserRole,
    targetRole: UserRole,
  ): boolean {
    const allowed = INVITE_PERMISSIONS[issuerRole] ?? [];
    return allowed.includes(targetRole);
  }
}


