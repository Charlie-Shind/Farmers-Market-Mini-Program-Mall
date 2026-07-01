import { Global, Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import { HttpExceptionFilter } from './filters/http-exception.filter';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { ResponseInterceptor } from './interceptors/response.interceptor';
import { RequestLoggingInterceptor } from './logging/request-logging.interceptor';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { ObjectStorageService } from './storage/object-storage.service';
import { PlatformDataService } from './services/platform-data.service';
import { AdminAuthSecurityService } from './services/admin-auth-security.service';
import { LeaderService } from './services/leader.service';
import { RequestIdMiddleware } from './logging/request-id.middleware';
import { requireConfigValue } from './utils/config';
import type { MiddlewareConsumer, NestModule } from '@nestjs/common';

@Global()
@Module({
  imports: [
    PrismaModule,
    RedisModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: requireConfigValue(configService, 'JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_ACCESS_EXPIRES_IN', '7d') as any,
        },
      }),
    }),
  ],
  providers: [
    PlatformDataService,
    AdminAuthSecurityService,
    LeaderService,
    ObjectStorageService,
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestLoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
  exports: [PlatformDataService, AdminAuthSecurityService, LeaderService, ObjectStorageService, RedisModule],
})
export class CommonModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
