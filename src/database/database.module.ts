import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get<string>('app.database.host'),
        port: configService.get<number>('app.database.port'),
        username: configService.get<string>('app.database.username'),
        password: configService.get<string>('app.database.password'),
        database: configService.get<string>('app.database.name'),
        autoLoadEntities: true,
        synchronize: false,
        migrationsRun: false,
        // logging: configService.get<string>('app.env') !== 'production',
        retryAttempts: Number(process.env.DATABASE_RETRY_ATTEMPTS ?? 5),
        retryDelay: Number(process.env.DATABASE_RETRY_DELAY ?? 2000),
        extra: {
          connectTimeout: Number(process.env.DATABASE_CONNECT_TIMEOUT ?? 20000),
        },
        timezone: '-03:00', // America/Bahia (UTC-3)
      }),
    }),
  ],
})
export class DatabaseModule {}
