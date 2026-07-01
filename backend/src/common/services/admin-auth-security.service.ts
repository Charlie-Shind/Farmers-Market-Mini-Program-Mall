import { HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { randomBytes, randomInt } from 'node:crypto';

import { RedisService } from '../redis/redis.service';

type MemoryEntry = {
  value: string;
  expiresAt: number;
};

const CAPTCHA_TTL_SEC = 300;
const FAIL_WINDOW_SEC = 900;
const MAX_FAIL_ATTEMPTS = 5;
const LOCKOUT_SEC = 900;

@Injectable()
export class AdminAuthSecurityService {
  private readonly memory = new Map<string, MemoryEntry>();

  constructor(private readonly redisService: RedisService) {}

  createCaptcha() {
    const captchaId = randomBytes(16).toString('hex');
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i += 1) {
      code += chars[randomInt(0, chars.length)];
    }

    this.setValue(`admin:captcha:${captchaId}`, code.toLowerCase(), CAPTCHA_TTL_SEC);

    const svg = [
      '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="44" viewBox="0 0 120 44">',
      '<rect width="120" height="44" rx="8" fill="#f4f6f4"/>',
      `<text x="60" y="28" text-anchor="middle" font-size="22" font-family="Arial,sans-serif" font-weight="700" fill="#2c4a39" letter-spacing="6">${code}</text>`,
      '</svg>',
    ].join('');

    return {
      captchaId,
      image: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`,
      expiresIn: CAPTCHA_TTL_SEC,
    };
  }

  async verifyCaptcha(captchaId: string, captchaCode: string) {
    const id = String(captchaId ?? '').trim();
    const code = String(captchaCode ?? '').trim().toLowerCase();
    if (!id || !code) {
      return false;
    }

    const key = `admin:captcha:${id}`;
    const expected = await this.getValue(key);
    await this.deleteValue(key);

    return Boolean(expected && expected === code);
  }

  async assertLoginAllowed(clientIp: string, username: string) {
    const ipKey = this.buildFailKey('ip', clientIp);
    const userKey = this.buildFailKey('user', username);
    const [ipFails, userFails] = await Promise.all([
      this.getCounter(ipKey),
      username ? this.getCounter(userKey) : Promise.resolve(0),
    ]);

    if (ipFails >= MAX_FAIL_ATTEMPTS || userFails >= MAX_FAIL_ATTEMPTS) {
      throw new HttpException('登录尝试过于频繁，请 15 分钟后再试', HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  async recordLoginFailure(clientIp: string, username: string) {
    await Promise.all([
      this.incrCounter(this.buildFailKey('ip', clientIp), FAIL_WINDOW_SEC),
      username ? this.incrCounter(this.buildFailKey('user', username), FAIL_WINDOW_SEC) : Promise.resolve(),
    ]);
  }

  async clearLoginFailures(clientIp: string, username: string) {
    await Promise.all([
      this.deleteValue(this.buildFailKey('ip', clientIp)),
      username ? this.deleteValue(this.buildFailKey('user', username)) : Promise.resolve(),
    ]);
  }

  buildInvalidCredentialsError() {
    return new UnauthorizedException('用户名或密码错误');
  }

  buildInvalidCaptchaError() {
    return new UnauthorizedException('验证码错误或已过期');
  }

  private buildFailKey(scope: 'ip' | 'user', value: string) {
    const normalized = String(value ?? '').trim().toLowerCase() || 'unknown';
    return `admin:login:fail:${scope}:${normalized}`;
  }

  private purgeMemory() {
    const now = Date.now();
    for (const [key, entry] of this.memory.entries()) {
      if (entry.expiresAt <= now) {
        this.memory.delete(key);
      }
    }
  }

  private setValue(key: string, value: string, ttlSec: number) {
    const client = this.redisService.getClient();
    if (client) {
      void client.setex(key, ttlSec, value);
      return;
    }

    this.purgeMemory();
    this.memory.set(key, {
      value,
      expiresAt: Date.now() + ttlSec * 1000,
    });
  }

  private async getValue(key: string): Promise<string | null> {
    const cached = await this.redisService.get(key);
    if (cached !== null) {
      return cached;
    }

    this.purgeMemory();
    const entry = this.memory.get(key);
    if (!entry || entry.expiresAt <= Date.now()) {
      this.memory.delete(key);
      return null;
    }
    return entry.value;
  }

  private async deleteValue(key: string) {
    await this.redisService.del(key);
    this.memory.delete(key);
  }

  private async getCounter(key: string): Promise<number> {
    const raw = await this.getValue(key);
    if (!raw) {
      return 0;
    }
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private async incrCounter(key: string, ttlSec: number) {
    const client = this.redisService.getClient();
    if (client) {
      const count = await client.incr(key);
      if (count === 1) {
        await client.expire(key, ttlSec);
      }
      return;
    }

    const current = await this.getCounter(key);
    this.setValue(key, String(current + 1), ttlSec);
  }
}
