import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Error interno del servidor';

    const errorMessage =
      typeof message === 'object' && message !== null
        ? (message as any).message || message
        : message;

    const responseBody: any = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      message: errorMessage,
    };

    if (typeof message === 'object' && message !== null) {
      responseBody.error = (message as any).error || 'Error';
    }

    const requestInfo = {
      method: request.method,
      url: request.url,
      statusCode: status,
      userAgent: request.get('user-agent') || 'unknown',
    };

    if (status >= 500) {
      this.logger.error(
        `[${status}] ${request.method} ${request.url} - ${errorMessage}`,
        exception instanceof Error ? exception.stack : '',
      );
    } else if (status >= 400) {
      this.logger.warn(
        `[${status}] ${request.method} ${request.url} - ${errorMessage}`,
      );
    } else {
      this.logger.log(
        `[${status}] ${request.method} ${request.url} - ${errorMessage}`,
      );
    }

    response.status(status).json(responseBody);
  }
}
