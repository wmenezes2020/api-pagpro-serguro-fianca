import { IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';

export class CreateSupportTicketDto {
  @IsString()
  @IsNotEmpty()
  @Length(3, 120)
  subject: string;

  @IsString()
  @IsNotEmpty()
  @Length(10, 1000)
  message: string;

  @IsOptional()
  @IsString()
  relatedEntityId?: string;
}
