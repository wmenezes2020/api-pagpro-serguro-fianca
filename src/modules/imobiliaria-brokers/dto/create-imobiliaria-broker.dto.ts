import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { BrokerStatus } from '../../../common/enums/broker-status.enum';

export class CreateImobiliariaBrokerDto {
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  fullName: string;

  @IsString()
  @Matches(/^\d{11}$/, {
    message: 'cpf deve conter 11 dígitos numéricos.',
  })
  cpf: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  creci?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsEnum(BrokerStatus)
  status?: BrokerStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}
