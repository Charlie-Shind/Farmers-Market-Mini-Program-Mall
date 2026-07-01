import {
  ArgumentsHost,
  Catch,
  Logger,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const payload = this.resolvePayload(exception);
    const requestId = String((request as Request & { requestId?: string }).requestId ?? '');

    this.logger.error(
      `${request.method} ${request.url} ${status} ${payload.message}${requestId ? ` requestId=${requestId}` : ''}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    response.status(status).json({
      success: false,
      statusCode: status,
      path: request.url,
      timestamp: new Date().toISOString(),
      requestId: requestId || undefined,
      message: payload.message,
      error: payload.error,
    });
  }

  private resolvePayload(exception: unknown): {
    message: string;
    error?: unknown;
  } {
    if (!(exception instanceof HttpException)) {
      return {
        message: 'Internal server error',
      };
    }

    const response = exception.getResponse();

    if (typeof response === 'string') {
      return {
        message: response,
      };
    }

    if (response && typeof response === 'object') {
      const responseObject = response as {
        message?: string | string[];
        error?: unknown;
      };

      return {
        message: Array.isArray(responseObject.message)
          ? responseObject.message.join(', ')
          : responseObject.message ?? exception.message,
        error: responseObject.error,
      };
    }

    return {
      message: exception.message,
    };
  }
}
