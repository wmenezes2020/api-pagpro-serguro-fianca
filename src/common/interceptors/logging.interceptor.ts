import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body, query, params } = request;
    const user = request.user;
    const now = Date.now();

    const logContext = {
      method,
      url,
      body: this.sanitizeBody(body),
      query,
      params,
      userId: user?.id,
      userEmail: user?.email,
    };

    this.logger.log(`→ ${method} ${url}`, JSON.stringify(logContext));

    return next.handle().pipe(
      tap({
        next: (data) => {
          const response = context.switchToHttp().getResponse();
          const { statusCode } = response;
          const duration = Date.now() - now;

          this.logger.log(
            `← ${method} ${url} ${statusCode} ${duration}ms`,
            JSON.stringify({ duration: `${duration}ms`, statusCode }),
          );
        },
        error: (error) => {
          const duration = Date.now() - now;
          this.logger.error(
            `✗ ${method} ${url} ${error.status || 500} ${duration}ms`,
            error.stack || error.message,
            JSON.stringify({ duration: `${duration}ms`, error: error.message }),
          );
        },
      }),
    );
  }

  private sanitizeBody(body: Record<string, unknown>): Record<string, unknown> {
    if (!body) return body;

    const sanitized = { ...body };
    const sensitiveFields = ['password', 'passwordHash', 'refreshToken'];

    sensitiveFields.forEach((field) => {
      if (sanitized[field]) {
        sanitized[field] = '***REDACTED***';
      }
    });

    return sanitized;
  }
}
