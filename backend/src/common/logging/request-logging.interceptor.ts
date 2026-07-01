import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';

import type { AuthUser } from '../types';

type RequestWithLogging = Request & {
  requestId?: string;
  user?: AuthUser;
};

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HttpRequest');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<RequestWithLogging>();
    const response = http.getResponse<Response>();
    const startedAt = Date.now();

    const requestId = request.requestId || String(request.headers['x-request-id'] ?? '');
    const method = request.method;
    const path = request.originalUrl || request.url;
    const userPart = request.user
      ? ` user=${request.user.role}:${request.user.sub}`
      : '';
    const requestPart = requestId ? ` requestId=${requestId}` : '';
    const ip = String(request.ip || request.headers['x-forwarded-for'] || '').split(',')[0].trim();
    const ipPart = ip ? ` ip=${ip}` : '';

    this.logger.log(`--> ${method} ${path}${requestPart}${userPart}${ipPart}`);

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startedAt;
          const statusCode = response.statusCode || 200;
          this.logger.log(`<-- ${method} ${path} ${statusCode} ${duration}ms${requestPart}${userPart}`);
        },
        error: (error: unknown) => {
          const duration = Date.now() - startedAt;
          const statusCode =
            typeof error === 'object' && error !== null && 'getStatus' in error
              ? Number((error as { getStatus: () => number }).getStatus())
              : 500;
          const message =
            error instanceof Error
              ? error.message
              : typeof error === 'string'
                ? error
                : 'Unknown error';
          this.logger.error(
            `<!! ${method} ${path} ${statusCode} ${duration}ms${requestPart}${userPart} ${message}`,
          );
        },
      }),
    );
  }
}
