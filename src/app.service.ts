import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
  constructor(private readonly configService: ConfigService) {}

  getHealthStatus() {
    return {
      status: 'ok',
      environment: this.configService.get<string>('app.env'),
      timestamp: new Date().toISOString(),
    };
  }
}
