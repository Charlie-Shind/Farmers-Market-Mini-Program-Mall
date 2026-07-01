import { Injectable } from '@nestjs/common';

import { APP_NAME } from './common/constants/app.constants';
import { PrismaService } from './common/prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(private readonly prismaService: PrismaService) {}

  getInfo() {
    return {
      name: APP_NAME,
      version: '1.0.0',
      status: 'running',
    };
  }

  async getHealth() {
    let database = 'down';

    try {
      await this.prismaService.$queryRawUnsafe('SELECT 1');
      database = 'connected';
    } catch {
      database = 'down';
    }

    return {
      status: 'ok',
      database,
      uptime: process.uptime(),
    };
  }
}
