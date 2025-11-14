import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApplicationStatus } from '../../../common/enums/application-status.enum';

export class UpdateApplicationStatusDto {
  @IsEnum(ApplicationStatus)
  status: ApplicationStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}
