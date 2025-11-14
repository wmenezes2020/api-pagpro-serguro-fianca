import { PartialType } from '@nestjs/swagger';
import { CreateImobiliariaClientDto } from './create-imobiliaria-client.dto';

export class UpdateImobiliariaClientDto extends PartialType(
  CreateImobiliariaClientDto,
) {}
