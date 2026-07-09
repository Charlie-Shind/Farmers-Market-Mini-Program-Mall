import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import { request as httpsRequest } from 'node:https';

type WechatAccessTokenResponse = {
  access_token?: string;
  expires_in?: number;
  errcode?: number;
  errmsg?: string;
};

type WechatCodeSessionResponse = {
  openid?: string;
  session_key?: string;
  unionid?: string;
  errcode?: number;
  errmsg?: string;
};

type WechatPhoneNumberResponse = {
  errcode?: number;
  errmsg?: string;
  phone_info?: {
    phoneNumber?: string;
    purePhoneNumber?: string;
    countryCode?: string;
    watermark?: {
      timestamp?: number;
      appid?: string;
    };
  };
};

type WechatVerifyInfoResponse = {
  errcode?: number;
  errmsg?: string;
  login_info?: {
    type?: string;
    login_time?: number;
  };
  user_info?: {
    user_id?: string;
    openapp_info?: {
      appid?: string;
      openid?: string;
      unionid?: string;
      headimgurl?: string;
      nickname?: string;
    };
    miniprogram_info?: {
      appid?: string;
      openid?: string;
      unionid?: string;
    };
    phone_info?: {
      phone?: string;
    };
  };
};

type WechatAccessTokenCache = {
  token: string;
  expiresAt: number;
};

type WechatIdentityAccessTokenCache = {
  token: string;
  expiresAt: number;
};

export type WechatCodeSession = {
  openid: string;
  sessionKey?: string;
  unionid?: string;
};

@Injectable()
export class WechatAuthService {
  private readonly logger = new Logger(WechatAuthService.name);
  private wechatAccessTokenCache: WechatAccessTokenCache | null = null;
  private wechatIdentityAccessTokenCache: WechatIdentityAccessTokenCache | null = null;

  constructor(private readonly configService: ConfigService) {}

  getMiniProgramAppId(): string {
    return this.configService.get<string>('WECHAT_MINI_PROGRAM_APP_ID', '').trim();
  }

  async resolveWechatCodeSession(code: string): Promise<WechatCodeSession> {
    if (this.isDevelopmentWechatCodeSessionBypassEnabled()) {
      this.logger.warn(`Using development fallback openid for WeChat code session: wechat_${code.slice(0, 8)}...`);
      return { openid: `wechat_${code}` };
    }

    const { appId, secret } = this.getWechatMiniProgramCredentials();
    const url = new URL(`${this.getWechatApiBaseUrl()}/sns/jscode2session`);
    url.searchParams.set('appid', appId);
    url.searchParams.set('secret', secret);
    url.searchParams.set('js_code', code);
    url.searchParams.set('grant_type', 'authorization_code');

    const payload = await this.fetchJson<WechatCodeSessionResponse>(url.toString(), {
      method: 'GET',
    });

    if (!payload.openid) {
      const upstreamError = payload.errcode ?? 'unknown';
      const upstreamMessage = payload.errmsg ?? '';
      this.logger.warn(`Failed to resolve WeChat code session: ${upstreamError} ${upstreamMessage}`);
      throw new BadGatewayException('Failed to resolve WeChat session');
    }

    return {
      openid: payload.openid,
      sessionKey: payload.session_key,
      unionid: payload.unionid,
    };
  }

  async resolveWechatPhoneNumberForLogin(phoneCode: string): Promise<string> {
    return this.resolveWechatPhoneNumber(phoneCode);
  }

  async resolveWechatSmsPhoneNumberForLogin(phoneCode: string): Promise<string> {
    return this.resolveWechatSmsPhoneNumber(phoneCode);
  }

  private getWechatApiBaseUrl(): string {
    return this.configService.get<string>('WECHAT_API_BASE_URL', 'https://api.weixin.qq.com').replace(/\/+$/, '');
  }

  private getWechatMiniProgramCredentials(): { appId: string; secret: string } {
    const appId = this.configService.get<string>('WECHAT_MINI_PROGRAM_APP_ID', '').trim();
    const secret = this.configService.get<string>('WECHAT_MINI_PROGRAM_SECRET', '').trim();

    if (!appId || !secret) {
      throw new InternalServerErrorException('WeChat mini-program credentials are not configured');
    }

    return { appId, secret };
  }

  private getWechatIdentityCredentials(): { appId: string; secret: string } {
    const appId = this.configService.get<string>('WECHAT_MULTI_APP_ID', '').trim();
    const secret = this.configService.get<string>('WECHAT_MULTI_APP_SECRET', '').trim();

    if (!appId || !secret) {
      throw new InternalServerErrorException('WeChat identity credentials are not configured');
    }

    return { appId, secret };
  }

  private isDevelopmentWechatPhoneBypassEnabled(): boolean {
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development').trim().toLowerCase();
    if (nodeEnv === 'production') {
      return false;
    }

    const secret = this.configService.get<string>('WECHAT_MINI_PROGRAM_SECRET', '').trim().toLowerCase();
    return !secret || secret.includes('replace-with') || secret.includes('change-me');
  }

  private isDevelopmentWechatCodeSessionBypassEnabled(): boolean {
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development').trim().toLowerCase();
    if (nodeEnv === 'production') {
      return false;
    }

    const secret = this.configService.get<string>('WECHAT_MINI_PROGRAM_SECRET', '').trim().toLowerCase();
    return !secret || secret.includes('replace-with') || secret.includes('change-me');
  }

  private isWechatAccessTokenExpired(errorCode?: number): boolean {
    return errorCode === 40001 || errorCode === 40013 || errorCode === 42001;
  }

  private buildDevelopmentPhoneNumber(phoneCode: string): string {
    const digest = createHash('sha256').update(phoneCode).digest('hex');
    const suffix = digest.replace(/\D/g, '').slice(0, 8).padEnd(8, '0');
    return `138${suffix.slice(0, 8)}`;
  }

  private async getWechatAccessToken(forceRefresh = false): Promise<string> {
    if (!forceRefresh && this.wechatAccessTokenCache && this.wechatAccessTokenCache.expiresAt > Date.now()) {
      return this.wechatAccessTokenCache.token;
    }

    const { appId, secret } = this.getWechatMiniProgramCredentials();
    const url = new URL(`${this.getWechatApiBaseUrl()}/cgi-bin/token`);
    url.searchParams.set('grant_type', 'client_credential');
    url.searchParams.set('appid', appId);
    url.searchParams.set('secret', secret);

    const payload = await this.fetchJson<WechatAccessTokenResponse>(url.toString(), {
      method: 'GET',
    });

    if (!payload.access_token) {
      this.logger.warn(`Failed to resolve WeChat access token: ${payload.errcode ?? 'unknown'} ${payload.errmsg ?? ''}`);
      throw new BadGatewayException('Failed to resolve WeChat access token');
    }

    const expiresIn = Number(payload.expires_in ?? 7200);
    const expiresAt = Date.now() + Math.max(expiresIn - 120, 60) * 1000;
    this.wechatAccessTokenCache = {
      token: payload.access_token,
      expiresAt,
    };

    return payload.access_token;
  }

  private async getWechatIdentityAccessToken(forceRefresh = false): Promise<string> {
    if (
      !forceRefresh &&
      this.wechatIdentityAccessTokenCache &&
      this.wechatIdentityAccessTokenCache.expiresAt > Date.now()
    ) {
      return this.wechatIdentityAccessTokenCache.token;
    }

    const { appId, secret } = this.getWechatIdentityCredentials();
    const url = new URL(`${this.getWechatApiBaseUrl()}/cgi-bin/token`);
    url.searchParams.set('appid', appId);
    url.searchParams.set('secret', secret);
    url.searchParams.set('grant_type', 'client_credential');

    const payload = await this.fetchJson<WechatAccessTokenResponse>(url.toString(), {
      method: 'GET',
    });

    if (!payload.access_token) {
      this.logger.warn(`Failed to resolve WeChat identity access token: ${payload.errcode ?? 'unknown'} ${payload.errmsg ?? ''}`);
      throw new BadGatewayException('Failed to resolve WeChat identity access token');
    }

    const expiresIn = Number(payload.expires_in ?? 7200);
    const expiresAt = Date.now() + Math.max(expiresIn - 120, 60) * 1000;
    this.wechatIdentityAccessTokenCache = {
      token: payload.access_token,
      expiresAt,
    };

    return payload.access_token;
  }

  private async resolveWechatPhoneNumber(phoneCode: string): Promise<string> {
    const code = phoneCode.trim();
    if (!code) {
      throw new BadRequestException('Phone verification code is required');
    }

    if (code.startsWith('mock_')) {
      return code.slice(5);
    }

    if (this.isDevelopmentWechatPhoneBypassEnabled()) {
      const mobile = this.buildDevelopmentPhoneNumber(code);
      this.logger.warn(`Using development fallback phone number for WeChat phone bind: ${mobile}`);
      return mobile;
    }

    const fetchPhoneNumber = async (accessToken: string): Promise<WechatPhoneNumberResponse> => {
      const url = new URL(`${this.getWechatApiBaseUrl()}/wxa/business/getuserphonenumber`);
      url.searchParams.set('access_token', accessToken);

      return this.fetchJson<WechatPhoneNumberResponse>(url.toString(), {
        method: 'POST',
        body: JSON.stringify({ code }),
      });
    };

    let payload = await fetchPhoneNumber(await this.getWechatAccessToken());

    if (this.isWechatAccessTokenExpired(payload.errcode)) {
      this.wechatAccessTokenCache = null;
      payload = await fetchPhoneNumber(await this.getWechatAccessToken(true));
    }

    const phoneNumber = payload.phone_info?.phoneNumber?.trim() || payload.phone_info?.purePhoneNumber?.trim();
    if (!phoneNumber) {
      const upstreamError = payload.errcode ?? 'unknown';
      const upstreamMessage = payload.errmsg ?? '';
      this.logger.warn(`Failed to resolve phone number: ${upstreamError} ${upstreamMessage}`);
      throw new BadGatewayException('Failed to resolve phone number');
    }

    return phoneNumber;
  }

  private async resolveWechatSmsPhoneNumber(phoneCode: string): Promise<string> {
    const code = phoneCode.trim();
    if (!code) {
      throw new BadRequestException('Phone verification code is required');
    }

    if (code.startsWith('mock_')) {
      return code.slice(5);
    }

    const { appId, secret } = this.getWechatIdentityCredentials();
    const fetchVerifyInfo = async (accessToken: string): Promise<WechatVerifyInfoResponse> => {
      const url = new URL(`${this.getWechatApiBaseUrl()}/donut/code2verifyinfo`);
      url.searchParams.set('access_token', accessToken);

      return this.requestJson<WechatVerifyInfoResponse>(url.toString(), {
        method: 'GET',
        body: JSON.stringify({
          appid: appId,
          appsecret: secret,
          code,
        }),
      });
    };

    let payload = await fetchVerifyInfo(await this.getWechatIdentityAccessToken());

    if (this.isWechatAccessTokenExpired(payload.errcode)) {
      this.wechatIdentityAccessTokenCache = null;
      payload = await fetchVerifyInfo(await this.getWechatIdentityAccessToken(true));
    }

    const phoneNumber = payload.user_info?.phone_info?.phone?.trim();
    if (!phoneNumber) {
      const upstreamError = payload.errcode ?? 'unknown';
      const upstreamMessage = payload.errmsg ?? '';
      this.logger.warn(`Failed to resolve SMS login phone number: ${upstreamError} ${upstreamMessage}`);
      throw new BadGatewayException('Failed to resolve phone number');
    }

    return phoneNumber;
  }

  private async fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
    const response = await fetch(url, {
      ...init,
      headers: {
        'content-type': 'application/json',
        ...(init?.headers ?? {}),
      },
    });

    if (!response.ok) {
      throw new BadGatewayException('WeChat service request failed');
    }

    try {
      return (await response.json()) as T;
    } catch {
      throw new BadGatewayException('WeChat service returned an invalid response');
    }
  }

  private async requestJson<T>(
    url: string,
    init?: {
      method?: string;
      headers?: Record<string, string>;
      body?: string;
    },
  ): Promise<T> {
    const target = new URL(url);
    const body = init?.body ?? '';

    return new Promise<T>((resolve, reject) => {
      const req = httpsRequest(
        {
          protocol: target.protocol,
          hostname: target.hostname,
          port: target.port || 443,
          path: `${target.pathname}${target.search}`,
          method: init?.method ?? 'GET',
          headers: {
            'content-type': 'application/json',
            ...(init?.headers ?? {}),
            ...(body ? { 'content-length': Buffer.byteLength(body).toString() } : {}),
          },
        },
        (res) => {
          const chunks: Buffer[] = [];

          res.on('data', (chunk) => {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          });

          res.on('end', () => {
            const raw = Buffer.concat(chunks).toString('utf8');
            if (!raw) {
              reject(new BadGatewayException('WeChat service returned an empty response'));
              return;
            }

            try {
              resolve(JSON.parse(raw) as T);
            } catch {
              reject(new BadGatewayException('WeChat service returned an invalid response'));
            }
          });
        },
      );

      req.on('error', () => {
        reject(new BadGatewayException('WeChat service request failed'));
      });

      if (body) {
        req.write(body);
      }

      req.end();
    });
  }
}
