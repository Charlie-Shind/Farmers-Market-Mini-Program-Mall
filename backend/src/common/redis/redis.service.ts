import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private isReady = false;

  constructor(configService: ConfigService) {
    const redisUrl = configService.get<string>('REDIS_URL');
    if (!redisUrl) {
      this.logger.warn('REDIS_URL is not configured. Redis service is disabled.');
      return;
    }

    try {
      this.client = new Redis(redisUrl, {
        maxRetriesPerRequest: 1,
        retryStrategy: (times) => {
          if (times > 3) {
            this.logger.error('Redis connection failed. Disabling Redis caching.');
            this.isReady = false;
            return null; // Stop retrying
          }
          return Math.min(times * 100, 2000);
        },
      });

      this.client.on('connect', () => {
        this.logger.log('Redis connected successfully.');
      });

      this.client.on('ready', () => {
        this.isReady = true;
      });

      this.client.on('error', (err) => {
        this.logger.error(`Redis error: ${err.message}`);
        this.isReady = false;
      });
    } catch (e: any) {
      this.logger.error(`Failed to initialize Redis client: ${e.message}`);
    }
  }

  getClient(): Redis | null {
    return this.isReady ? this.client : null;
  }

  async get(key: string): Promise<string | null> {
    if (!this.isReady || !this.client) return null;
    try {
      return await this.client.get(key);
    } catch (e: any) {
      this.logger.error(`Redis GET error for key ${key}: ${e.message}`);
      return null;
    }
  }

  async setex(key: string, seconds: number, value: string): Promise<void> {
    if (!this.isReady || !this.client) return;
    try {
      await this.client.setex(key, seconds, value);
    } catch (e: any) {
      this.logger.error(`Redis SETEX error for key ${key}: ${e.message}`);
    }
  }

  async del(key: string): Promise<void> {
    if (!this.isReady || !this.client) return;
    try {
      await this.client.del(key);
    } catch (e: any) {
      this.logger.error(`Redis DEL error for key ${key}: ${e.message}`);
    }
  }

  async zincrby(key: string, increment: number, member: string): Promise<void> {
    if (!this.isReady || !this.client) return;
    try {
      await this.client.zincrby(key, increment, member);
    } catch (e: any) {
      this.logger.error(`Redis ZINCRBY error for key ${key}: ${e.message}`);
    }
  }

  async zrevrange(key: string, start: number, stop: number): Promise<string[]> {
    if (!this.isReady || !this.client) return [];
    try {
      return await this.client.zrevrange(key, start, stop);
    } catch (e: any) {
      this.logger.error(`Redis ZREVRANGE error for key ${key}: ${e.message}`);
      return [];
    }
  }

  async keys(pattern: string): Promise<string[]> {
    if (!this.isReady || !this.client) return [];
    try {
      return await this.client.keys(pattern);
    } catch (e: any) {
      this.logger.error(`Redis KEYS error for pattern ${pattern}: ${e.message}`);
      return [];
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
    }
  }
}
