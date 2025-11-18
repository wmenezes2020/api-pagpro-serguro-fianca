import { IsEnum, IsNumber, IsString, IsOptional, IsBoolean } from 'class-validator';
import { UserRole } from '../../../common/enums/user-role.enum';

export class CreateCommissionRateDto {
  @IsEnum(UserRole)
  role: UserRole;

  @IsNumber()
  percentage: number;

  @IsString()
  commissionType: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  description?: string;
}

