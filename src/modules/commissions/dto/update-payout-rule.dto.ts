import { IsEnum, IsNumber, Max, Min } from 'class-validator';
import { UserRole } from '../../../common/enums/user-role.enum';

export class UpdatePayoutRuleDto {
  @IsEnum(UserRole)
  role: UserRole;

  @IsNumber()
  @Min(0)
  @Max(100)
  percentage: number;
}
