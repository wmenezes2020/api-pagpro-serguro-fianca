import { Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ClientStatus } from '../../../common/enums/client-status.enum';

export class CreateImobiliariaClientDto {
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  fullName: string;

  @IsString()
  @Matches(/^\d{11}$|^\d{14}$/, {
    message: 'document deve conter 11 (CPF) ou 14 (CNPJ) dígitos numéricos.',
  })
  document: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  monthlyIncome?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  origin?: string;

  @IsOptional()
  @IsEnum(ClientStatus)
  status?: ClientStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}
