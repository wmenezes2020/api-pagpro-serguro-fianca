import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
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
  await app.listen(port);
  logger.log(`Aplicação executando na porta ${port}`);
  logger.log(
    `Documentação Swagger disponível em http://localhost:${port}/api/docs`,
  );
}

void bootstrap();
