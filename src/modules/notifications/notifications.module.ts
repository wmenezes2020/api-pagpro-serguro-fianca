import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { EmailNotificationService } from './email-notification.service';
import { WhatsAppNotificationService } from './whatsapp-notification.service';
import { EvolutionApiService } from './evolution-api.service';

@Module({
  imports: [TypeOrmModule.forFeature([Notification]), HttpModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    EmailNotificationService,
    EvolutionApiService,
    WhatsAppNotificationService,
  ],
  exports: [
    NotificationsService,
    EmailNotificationService,
    WhatsAppNotificationService,
  ],
})
export class NotificationsModule {}
