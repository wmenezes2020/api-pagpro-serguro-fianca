import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
  MinLength,
} from 'class-validator';

export class RegisterInquilinoDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsString()
  @Matches(/^\d{11}$/)
  cpf: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsNumber()
  @Min(0)
  monthlyIncome: number;

  @IsBoolean()
  hasNegativeRecords: boolean;

  @IsOptional()
  @IsString()
  employmentStatus?: string;
}
