import { IsEnum, IsString, IsOptional, IsObject } from 'class-validator';
import { NotificationType } from '../../../common/enums/notification-type.enum';

export class CreateNotificationDto {
  @IsEnum(NotificationType)
  type: NotificationType;

  @IsString()
  title: string;

  @IsString()
  message: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
