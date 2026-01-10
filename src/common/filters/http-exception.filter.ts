import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Gerar ID único para rastreamento
    const requestId = this.generateRequestId();
    const timestamp = new Date().toISOString();

    // Determinar status e mensagem baseado no tipo de exceção
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | object = 'Erro interno do servidor';
    let errorDetails: Record<string, unknown> = {};

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (exceptionResponse as { message: string }).message ||
            'Erro desconhecido';
      
      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        errorDetails = exceptionResponse as Record<string, unknown>;
      }
    } else if (exception instanceof QueryFailedError) {
      // Tratar erros do TypeORM/banco de dados
      status = HttpStatus.BAD_REQUEST;
      message = 'Erro ao processar solicitação no banco de dados';
      
      const driverError = (exception as any).driverError || {};
      errorDetails = {
        type: 'DatabaseError',
        code: driverError.code || 'UNKNOWN',
        sqlState: driverError.sqlState || null,
        sqlMessage: driverError.sqlMessage || exception.message,
        ...(driverError.sql ? { sql: this.sanitizeSql(driverError.sql) } : {}),
      };

      // Log detalhado para erros de banco de dados
      this.logger.error(
        `[${requestId}] Database Error: ${request.method} ${request.url}`,
        {
          error: exception.message,
          code: driverError.code,
          sql: driverError.sql ? this.sanitizeSql(driverError.sql) : null,
          stack: exception.stack,
          userId: (request as any).user?.id,
          userEmail: (request as any).user?.email,
        },
      );
    } else if (exception instanceof Error) {
      // Tratar outros erros de JavaScript/TypeScript
      message = exception.message || 'Erro interno do servidor';
      errorDetails = {
        type: exception.constructor.name,
        name: exception.name,
      };

      // Log detalhado para erros não tratados
      this.logger.error(
        `[${requestId}] Unhandled Error: ${request.method} ${request.url}`,
        {
          error: exception.message,
          name: exception.name,
          stack: exception.stack,
          userId: (request as any).user?.id,
          userEmail: (request as any).user?.email,
        },
      );
    } else {
      // Erro desconhecido
      this.logger.error(
        `[${requestId}] Unknown Error: ${request.method} ${request.url}`,
        {
          error: JSON.stringify(exception),
          userId: (request as any).user?.id,
          userEmail: (request as any).user?.email,
        },
      );
    }

    const errorResponse = {
      statusCode: status,
      timestamp,
      requestId,
      path: request.url,
      method: request.method,
      message: typeof message === 'string' ? message : String(message),
      ...(Object.keys(errorDetails).length > 0 ? { details: errorDetails } : {}),
    };

    // Log apropriado baseado no status
    if (status >= 500) {
      this.logger.error(
        `[${requestId}] ${request.method} ${request.url} - ${status}`,
        {
          ...errorResponse,
          exception:
            exception instanceof Error
              ? {
                  name: exception.name,
                  message: exception.message,
                  stack: exception.stack,
                }
              : exception,
        },
      );
    } else if (status >= 400) {
      this.logger.warn(
        `[${requestId}] ${request.method} ${request.url} - ${status}: ${errorResponse.message}`,
        {
          userId: (request as any).user?.id,
          userEmail: (request as any).user?.email,
        },
      );
    }

    // Não permitir que erros causem reinicialização da aplicação
    // Sempre retornar resposta HTTP apropriada
    response.status(status).json(errorResponse);
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private sanitizeSql(sql: string): string {
    if (!sql) return '';
    // Remover valores sensíveis de queries SQL
    return sql
      .replace(/'([^']*)'/g, (match) => {
        // Se parecer ser senha ou token, mascarar
        if (match.length > 20) {
          return "'***REDACTED***'";
        }
        return match;
      })
      .substring(0, 500); // Limitar tamanho do log
  }
}
