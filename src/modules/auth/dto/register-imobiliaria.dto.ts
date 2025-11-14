import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  MinLength,
} from 'class-validator';

export class RegisterImobiliariaDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @Length(2, 120)
  fullName: string;

  @IsOptional()
  @IsString()
  @Length(8, 20)
  phone?: string;

  @IsString()
  @IsNotEmpty()
  companyName: string;

  @IsString()
  @Matches(/^\d{14}$/)
  cnpj: string;

  @IsOptional()
  @IsString()
  creci?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  postalCode?: string;
}
