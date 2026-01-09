import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateRentalApplicationDto {
  @IsUUID()
  propertyId: string;

  @IsOptional()
  @IsUUID()
  applicantId?: string;

  @IsOptional()
  @IsUUID()
  brokerId?: string;

  @IsNumber()
  @Min(0)
  monthlyIncome: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  monthlyRentValue?: number;

  @IsOptional()
  @IsEnum(['COMERCIAL', 'RESIDENCIAL'])
  contractType?: 'COMERCIAL' | 'RESIDENCIAL';

  @IsOptional()
  @IsEnum(['PF', 'PJ'])
  tenantType?: 'PF' | 'PJ';

  @IsBoolean()
  hasNegativeRecords: boolean;

  @IsOptional()
  @IsString()
  employmentStatus?: string;

  @IsOptional()
  documents?: Record<string, string>;

  @IsOptional()
  @IsString()
  notes?: string;
}
