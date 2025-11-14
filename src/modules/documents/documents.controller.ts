import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  ParseUUIDPipe,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Query,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: User,
    @Query('relatedEntityType') relatedEntityType?: string,
    @Query('relatedEntityId') relatedEntityId?: string,
    @Query('description') description?: string,
  ) {
    return this.documentsService.upload(
      file,
      user,
      relatedEntityType,
      relatedEntityId,
      description,
    );
  }

  @Get()
  async findAll(
    @CurrentUser() user: User,
    @Query('relatedEntityType') relatedEntityType?: string,
    @Query('relatedEntityId') relatedEntityId?: string,
  ) {
    if (relatedEntityType && relatedEntityId) {
      return this.documentsService.findByRelatedEntity(
        relatedEntityType,
        relatedEntityId,
      );
    }
    return this.documentsService.findAllForUser(user.id);
  }

  @Get(':id')
  async findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: User,
  ) {
    return this.documentsService.findOne(id, user.id);
  }

  @Get(':id/download')
  async download(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: User,
    @Res() res: Response,
  ) {
    const downloadUrl = await this.documentsService.getDownloadUrl(id, user.id);
    return res.redirect(downloadUrl);
  }

  @Delete(':id')
  async delete(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: User,
  ) {
    await this.documentsService.delete(id, user.id);
    return { success: true };
  }
}
