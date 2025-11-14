import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { validationSchema } from './config/validation';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { ApplicationsModule } from './modules/applications/applications.module';
import { SupportModule } from './modules/support/support.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { ImobiliariaClientsModule } from './modules/imobiliaria-clients/imobiliaria-clients.module';
import { ImobiliariaBrokersModule } from './modules/imobiliaria-brokers/imobiliaria-brokers.module';
import { AIModule } from './modules/ai/ai.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
    }),
    DatabaseModule,
    UsersModule,
    AuthModule,
    ApplicationsModule,
    SupportModule,
    NotificationsModule,
    DocumentsModule,
    ImobiliariaClientsModule,
    ImobiliariaBrokersModule,
    AIModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
