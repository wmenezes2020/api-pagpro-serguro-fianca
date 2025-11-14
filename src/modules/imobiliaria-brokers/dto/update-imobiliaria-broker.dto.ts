import { PartialType } from '@nestjs/swagger';
import { CreateImobiliariaBrokerDto } from './create-imobiliaria-broker.dto';

export class UpdateImobiliariaBrokerDto extends PartialType(
  CreateImobiliariaBrokerDto,
) {}
