import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { User } from '../users/entities/user.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationType } from '../../common/enums/notification-type.enum';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) {}

  async create(
    userId: string,
    dto: CreateNotificationDto,
  ): Promise<Notification> {
    const notification = this.notificationRepository.create({
      user: { id: userId } as User,
      ...dto,
    });
    return this.notificationRepository.save(notification);
  }

  async createForUser(
    user: User,
    type: NotificationType,
    title: string,
    message: string,
    metadata?: Record<string, unknown>,
  ): Promise<Notification> {
    return this.create(user.id, { type, title, message, metadata });
  }

  async findAllForUser(userId: string): Promise<Notification[]> {
    return this.notificationRepository.find({
      where: { user: { id: userId } },
      order: { createdAt: 'DESC' },
    });
  }

  async findUnreadCount(userId: string): Promise<number> {
    return this.notificationRepository.count({
      where: { user: { id: userId }, read: false },
    });
  }

  async markAsRead(id: string, userId: string): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { id, user: { id: userId } },
    });

    if (!notification) {
      throw new Error('Notificação não encontrada.');
    }

    notification.read = true;
    notification.readAt = new Date();
    return this.notificationRepository.save(notification);
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationRepository.update(
      { user: { id: userId }, read: false },
      { read: true, readAt: new Date() },
    );
  }

  async delete(id: string, userId: string): Promise<void> {
    await this.notificationRepository.delete({
      id,
      user: { id: userId },
    });
  }
}
