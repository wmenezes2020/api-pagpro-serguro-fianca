import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { BlobServiceClient, BlockBlobClient } from '@azure/storage-blob';
import { randomUUID } from 'crypto';
import { Document } from './entities/document.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class DocumentsService implements OnModuleInit {
  private readonly logger = new Logger(DocumentsService.name);
  private blobServiceClient: BlobServiceClient | null = null;
  private containerName: string;
  private isAzureConfigured = false;

  constructor(
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    private readonly configService: ConfigService,
  ) {
    const connectionString = this.configService.get<string>(
      'AZURE_STORAGE_CONNECTION_STRING',
    );
    this.containerName =
      this.configService.get<string>('AZURE_STORAGE_CONTAINER') || 'documents';

    if (connectionString && !this.isPlaceholder(connectionString)) {
      try {
        this.blobServiceClient =
          BlobServiceClient.fromConnectionString(connectionString);
        this.isAzureConfigured = true;
      } catch (error) {
        this.logger.warn(
          'Falha ao inicializar Azure Blob Storage. Upload de documentos estará desabilitado.',
        );
        this.logger.debug(error.message);
      }
    } else {
      this.logger.warn(
        'AZURE_STORAGE_CONNECTION_STRING não configurada ou é um placeholder. Upload de documentos estará desabilitado.',
      );
    }
  }

  async onModuleInit() {
    if (this.isAzureConfigured && this.blobServiceClient) {
      try {
        await this.initializeContainer();
        this.logger.log('Azure Blob Storage inicializado com sucesso');
      } catch (error) {
        this.logger.error(
          'Falha ao inicializar container do Azure Blob Storage',
          error.stack,
        );
        this.isAzureConfigured = false;
      }
    }
  }

  private isPlaceholder(connectionString: string): boolean {
    return (
      connectionString.includes('your_account') ||
      connectionString.includes('placeholder') ||
      connectionString.includes('example.com')
    );
  }

  private async initializeContainer() {
    if (!this.blobServiceClient) {
      return;
    }

    const containerClient = this.blobServiceClient.getContainerClient(
      this.containerName,
    );
    const exists = await containerClient.exists();
    if (!exists) {
      await containerClient.create({
        access: 'blob',
      });
    }
  }

  private ensureAzureConfigured() {
    if (!this.isAzureConfigured || !this.blobServiceClient) {
      throw new BadRequestException(
        'Azure Blob Storage não está configurado. Configure AZURE_STORAGE_CONNECTION_STRING no arquivo .env',
      );
    }
  }

  async upload(
    file: Express.Multer.File | undefined,
    user: User,
    relatedEntityType?: string,
    relatedEntityId?: string,
    description?: string,
  ): Promise<Document> {
    this.ensureAzureConfigured();

    if (!file) {
      throw new BadRequestException('Arquivo não fornecido');
    }

    const allowedMimeTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/jpg',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Tipo de arquivo não permitido. Use PDF, imagens ou documentos do Office.',
      );
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new BadRequestException('Arquivo muito grande. Máximo: 10MB');
    }

    const blobName = `${user.id}/${randomUUID()}-${file.originalname}`;
    const blockBlobClient = this.blobServiceClient!.getContainerClient(
      this.containerName,
    ).getBlockBlobClient(blobName);

    await blockBlobClient.upload(file.buffer, file.size, {
      blobHTTPHeaders: {
        blobContentType: file.mimetype,
      },
    });

    const blobUrl = blockBlobClient.url;

    const document = this.documentRepository.create({
      uploadedBy: user,
      fileName: file.originalname,
      originalFileName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      blobUrl,
      blobContainer: this.containerName,
      blobName,
      relatedEntityType,
      relatedEntityId,
      description,
    });

    return this.documentRepository.save(document);
  }

  async findOne(id: string, userId: string): Promise<Document> {
    const document = await this.documentRepository.findOne({
      where: { id, uploadedBy: { id: userId } },
    });

    if (!document) {
      throw new NotFoundException('Documento não encontrado');
    }

    return document;
  }

  async findAllForUser(userId: string): Promise<Document[]> {
    return this.documentRepository.find({
      where: { uploadedBy: { id: userId } },
      order: { createdAt: 'DESC' },
    });
  }

  async findByRelatedEntity(
    relatedEntityType: string,
    relatedEntityId: string,
  ): Promise<Document[]> {
    return this.documentRepository.find({
      where: {
        relatedEntityType,
        relatedEntityId,
      },
      order: { createdAt: 'DESC' },
    });
  }

  async getDownloadUrl(id: string, userId: string): Promise<string> {
    this.ensureAzureConfigured();

    const document = await this.findOne(id, userId);

    const blockBlobClient = this.blobServiceClient!.getContainerClient(
      document.blobContainer,
    ).getBlockBlobClient(document.blobName);

    const sasUrl = await this.generateSasUrl(blockBlobClient);
    return sasUrl;
  }

  private async generateSasUrl(
    blockBlobClient: BlockBlobClient,
  ): Promise<string> {
    const expiresOn = new Date();
    expiresOn.setHours(expiresOn.getHours() + 1); // URL válida por 1 hora

    const sasUrl = blockBlobClient.generateSasUrl({
      permissions: 'r' as any,
      expiresOn,
    });

    return sasUrl;
  }

  async delete(id: string, userId: string): Promise<void> {
    this.ensureAzureConfigured();

    const document = await this.findOne(id, userId);

    const blockBlobClient = this.blobServiceClient!.getContainerClient(
      document.blobContainer,
    ).getBlockBlobClient(document.blobName);

    await blockBlobClient.delete();
    await this.documentRepository.remove(document);
  }
}
