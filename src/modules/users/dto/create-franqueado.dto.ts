import {
  IsEmail,
  IsOptional,
  IsString,
  Length,
  Matches,
  MinLength,
} from 'class-validator';

export class CreateFranqueadoDto {
  @IsString()
  @Length(2, 120)
  fullName: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsString()
  @Length(8, 20)
  phone?: string;

  @IsString()
  @Length(2, 160)
  companyName: string;

  @IsOptional()
  @Matches(/^\d{11}$|^\d{14}$/, {
    message: 'Documento deve conter 11 (CPF) ou 14 dígitos (CNPJ).',
  })
  document?: string;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

