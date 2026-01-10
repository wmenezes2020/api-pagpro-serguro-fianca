import { Logger, ValidationPipe, HttpException, HttpStatus } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  // Tratamento global de erros não capturados
  process.on('uncaughtException', (error: Error) => {
    const logger = new Logger('UncaughtException');
    logger.error('Erro não capturado detectado:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
    });
    // Não fazer process.exit() para evitar reinicialização em loop
    // A aplicação deve continuar rodando e tratar o erro
  });

  process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
    const logger = new Logger('UnhandledRejection');
    logger.error('Promise rejeitada não tratada:', {
      reason: reason instanceof Error
        ? {
            name: reason.name,
            message: reason.message,
            stack: reason.stack,
          }
        : reason,
      promise: promise.toString(),
    });
    // Não fazer process.exit() para evitar reinicialização em loop
  });

  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      forbidUnknownValues: true,
      exceptionFactory: (errors) => {
        // Log detalhado de erros de validação
        const logger = new Logger('ValidationPipe');
        logger.warn('Erro de validação:', {
          errors: errors.map((err) => ({
            property: err.property,
            constraints: err.constraints,
            value: err.value,
          })),
        });
        return new HttpException(
          {
            message: 'Dados de entrada inválidos',
            errors: errors.map((err) => ({
              property: err.property,
              constraints: err.constraints,
            })),
          },
          HttpStatus.BAD_REQUEST,
        );
      },
    }),
  );
  app.useGlobalInterceptors(new LoggingInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  const corsOrigins = configService.get<string[]>('app.corsOrigins') ?? ['*'];
  app.enableCors({
    origin: corsOrigins.length === 0 ? '*' : corsOrigins,
    credentials: true,
  });

  // Swagger Configuration
  const swaggerConfig = new DocumentBuilder()
    .setTitle('PagPro Seguro Fiança API')
    .setDescription(
      'API para gestão de imobiliárias, inquilinos e corretores com fluxo completo de solicitações de seguro fiança, análise de crédito, emissão de apólices e pagamentos.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('auth', 'Autenticação e autorização')
    .addTag('users', 'Gestão de usuários')
    .addTag('properties', 'Gestão de propriedades')
    .addTag('applications', 'Solicitações de seguro fiança')
    .addTag('support', 'Sistema de suporte')
    .addTag('notifications', 'Sistema de notificações')
    .addTag('documents', 'Upload e gestão de documentos')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = configService.get<number>('app.port', 3000);
  
  try {
    await app.listen(port);
    logger.log(`✅ Aplicação executando na porta ${port}`);
    logger.log(
      `📚 Documentação Swagger disponível em http://localhost:${port}/api/docs`,
    );
  } catch (error: any) {
    logger.error('❌ Erro ao iniciar aplicação:', {
      message: error?.message || String(error),
      code: error?.code || 'UNKNOWN',
      stack: error?.stack || 'No stack trace',
    });
    // Não fazer process.exit() para permitir que o processo supervisor tente novamente
    throw error;
  }
}

// Executar bootstrap com tratamento de erros
bootstrap().catch((error: unknown) => {
  const logger = new Logger('Bootstrap');
  logger.error('❌ Erro fatal ao inicializar aplicação:', {
    error: error instanceof Error
      ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        }
      : error,
  });
  // Não fazer process.exit() para evitar reinicialização em loop
  // O processo supervisor (Docker, PM2, etc.) deve gerenciar reinicializações
});
