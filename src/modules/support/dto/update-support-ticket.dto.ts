import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { TicketStatus } from '../../../common/enums/ticket-status.enum';

export class UpdateSupportTicketDto {
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  @IsOptional()
  @IsString()
  message?: string;
}
