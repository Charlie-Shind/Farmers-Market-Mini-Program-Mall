import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';

import { RoleCode } from '../../../common/enums/role.enum';
import { TokenType } from '../../../common/enums/token-type.enum';
import { AuthUser } from '../../../common/types/auth-user.type';
import { PlatformDataService } from '../../../common/services/platform-data.service';
import { resolveProfileNickname, resolveProfileText } from '../../../common/utils/profile';
import { requireConfigValue } from '../../../common/utils/config';
import { AUTH_MODULE_NAME } from './auth.constants';
import { AuthSessionResponse, AuthSessionUser } from './auth.types';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly platformDataService: PlatformDataService,
  ) {}

  getStatus() {
    return {
      module: AUTH_MODULE_NAME,
      status: 'ready',
      note: 'Anonymous token, JWT validation, WeChat login, and SMS login are available.',
    };
  }

  private buildSessionResponse(user: AuthSessionUser, tokenType: TokenType, accessToken: string): AuthSessionResponse {
    return {
      tokenType,
      accessToken,
      tokenPrefix: 'Bearer',
      expiresIn: this.configService.get<string>(
        tokenType === TokenType.GUEST ? 'JWT_GUEST_EXPIRES_IN' : 'JWT_ACCESS_EXPIRES_IN',
        '7d',
      ),
      user,
    };
  }

  async issueAnonymousToken(): Promise<AuthSessionResponse> {
    const guestSub = `guest_${randomUUID().replace(/-/g, '').slice(0, 16)}`;
    const payload: AuthUser = {
      sub: guestSub,
      role: RoleCode.GUEST,
      tokenType: TokenType.GUEST,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: requireConfigValue(this.configService, 'JWT_SECRET'),
      expiresIn: this.configService.get<string>('JWT_GUEST_EXPIRES_IN', '7d') as any,
    });

    const guestUser = await this.platformDataService.ensureUser(payload);

    return this.buildSessionResponse(
      {
        ...payload,
        userId: Number(guestUser.id),
        accountNo: guestUser.accountNo ?? '',
        nickname: resolveProfileNickname(guestUser.nickname, guestUser.openid, '游客用户'),
        avatarUrl: resolveProfileText(guestUser.avatarUrl, ''),
        mobile: resolveProfileText(guestUser.mobile, ''),
        status: guestUser.status,
        lastLoginAt: guestUser.lastLoginAt ? guestUser.lastLoginAt.toISOString() : '',
      },
      TokenType.GUEST,
      accessToken,
    );
  }

  async issueWechatToken(body: Record<string, unknown>): Promise<AuthSessionResponse> {
    const code = String(body.code ?? body.loginCode ?? '').trim();

    if (!code) {
      throw new BadRequestException('Wechat login code is required');
    }

    const user = await this.platformDataService.upsertWechatUser(body);
    const role = await this.platformDataService.getUserDBRole(user.id);
    const payload: AuthUser = {
      sub: user.openid,
      role,
      tokenType: TokenType.ACCESS,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: requireConfigValue(this.configService, 'JWT_SECRET'),
      expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '7d') as any,
    });

    return this.buildSessionResponse(
      {
        ...payload,
        userId: Number(user.id),
        accountNo: user.accountNo ?? '',
        nickname: resolveProfileNickname(user.nickname, user.openid, '微信用户'),
        avatarUrl: resolveProfileText(user.avatarUrl, ''),
        mobile: resolveProfileText(user.mobile, ''),
        status: user.status,
        lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : '',
      },
      TokenType.ACCESS,
      accessToken,
    );
  }

  async bindWechatPhone(body: Record<string, unknown>): Promise<AuthSessionResponse> {
    const user = await this.platformDataService.bindWechatPhone(body);
    const role = await this.platformDataService.getUserDBRole(user.id);
    const payload: AuthUser = {
      sub: user.openid,
      role,
      tokenType: TokenType.ACCESS,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: requireConfigValue(this.configService, 'JWT_SECRET'),
      expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '7d') as any,
    });

    return this.buildSessionResponse(
      {
        ...payload,
        userId: Number(user.id),
        accountNo: user.accountNo ?? '',
        nickname: resolveProfileNickname(user.nickname, user.openid, '微信用户'),
        avatarUrl: resolveProfileText(user.avatarUrl, ''),
        mobile: resolveProfileText(user.mobile, ''),
        status: user.status,
        lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : '',
      },
      TokenType.ACCESS,
      accessToken,
    );
  }

  async loginWithWechatPhone(body: Record<string, unknown>): Promise<AuthSessionResponse> {
    const phoneCode = String(body.phoneCode ?? body.code ?? '').trim();

    if (!phoneCode) {
      throw new BadRequestException('Phone verification code is required');
    }

    const mobile = await this.platformDataService.resolveWechatPhoneNumberForLogin(phoneCode);
    const user = await this.platformDataService.upsertPhoneLoginUser({
      ...body,
      mobile,
    });

    const role = await this.platformDataService.getUserDBRole(user.id);
    const payload: AuthUser = {
      sub: user.openid,
      role,
      tokenType: TokenType.ACCESS,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: requireConfigValue(this.configService, 'JWT_SECRET'),
      expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '7d') as any,
    });

    return this.buildSessionResponse(
      {
        ...payload,
        userId: Number(user.id),
        accountNo: user.accountNo ?? '',
        nickname: resolveProfileNickname(user.nickname, user.openid, '手机号用户'),
        avatarUrl: resolveProfileText(user.avatarUrl, ''),
        mobile: resolveProfileText(user.mobile, ''),
        status: user.status,
        lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : '',
      },
      TokenType.ACCESS,
      accessToken,
    );
  }

  async loginWithWechatSms(body: Record<string, unknown>): Promise<AuthSessionResponse> {
    const smsCode = String(body.code ?? body.verifyCode ?? '').trim();

    if (!smsCode) {
      throw new BadRequestException('SMS login code is required');
    }

    const mobile = await this.platformDataService.resolveWechatSmsPhoneNumberForLogin(smsCode);
    const user = await this.platformDataService.upsertPhoneLoginUser({
      ...body,
      mobile,
    });

    const role = await this.platformDataService.getUserDBRole(user.id);
    const payload: AuthUser = {
      sub: user.openid,
      role,
      tokenType: TokenType.ACCESS,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: requireConfigValue(this.configService, 'JWT_SECRET'),
      expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '7d') as any,
    });

    return this.buildSessionResponse(
      {
        ...payload,
        userId: Number(user.id),
        accountNo: user.accountNo ?? '',
        nickname: resolveProfileNickname(user.nickname, user.openid, '手机号用户'),
        avatarUrl: resolveProfileText(user.avatarUrl, ''),
        mobile: resolveProfileText(user.mobile, ''),
        status: user.status,
        lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : '',
      },
      TokenType.ACCESS,
      accessToken,
    );
  }

  async refreshSessionToken(authUser: AuthUser): Promise<AuthSessionResponse> {
    if (authUser.tokenType === TokenType.GUEST || authUser.role === RoleCode.GUEST) {
      throw new BadRequestException('Guest session cannot be refreshed');
    }

    const user = await this.platformDataService.ensureUser(authUser);
    const role = await this.platformDataService.getUserDBRole(user.id);
    const payload: AuthUser = {
      sub: user.openid,
      role,
      tokenType: TokenType.ACCESS,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: requireConfigValue(this.configService, 'JWT_SECRET'),
      expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '7d') as any,
    });

    return this.buildSessionResponse(
      {
        ...payload,
        userId: Number(user.id),
        accountNo: user.accountNo ?? '',
        nickname: resolveProfileNickname(user.nickname, user.openid, '微信用户'),
        avatarUrl: resolveProfileText(user.avatarUrl, ''),
        mobile: resolveProfileText(user.mobile, ''),
        status: user.status,
        lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : '',
      },
      TokenType.ACCESS,
      accessToken,
    );
  }

  async refreshToken(authUser: AuthUser): Promise<AuthSessionResponse> {
    if (authUser.role === RoleCode.GUEST) {
      throw new BadRequestException('Guest session cannot be refreshed');
    }

    const user = await this.platformDataService.ensureUser(authUser);
    const role = await this.platformDataService.getUserDBRole(user.id);
    const payload: AuthUser = {
      sub: user.openid,
      role,
      tokenType: TokenType.ACCESS,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: requireConfigValue(this.configService, 'JWT_SECRET'),
      expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '7d') as any,
    });

    return this.buildSessionResponse(
      {
        ...payload,
        userId: Number(user.id),
        accountNo: user.accountNo ?? '',
        nickname: resolveProfileNickname(user.nickname, user.openid, '微信用户'),
        avatarUrl: resolveProfileText(user.avatarUrl, ''),
        mobile: resolveProfileText(user.mobile, ''),
        status: user.status,
        lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : '',
      },
      TokenType.ACCESS,
      accessToken,
    );
  }
}
