import { BadRequestException, Body, Controller, Get, Patch, Post } from '@nestjs/common';

import { CurrentUser, Public, Roles } from '../../../common/decorators';
import { RoleCode } from '../../../common/enums/role.enum';
import { PlatformDataService } from '../../../common/services/platform-data.service';
import { AuthUser } from '../../../common/types';

import { AuthService } from './auth.service';
import { AuthProfileResponse, AuthSessionResponse } from './auth.types';

function buildProfileUser(
  user: AuthUser,
  profile: AuthProfileResponse['profile'],
): AuthProfileResponse['user'] {
  return {
    ...user,
    userId: profile.userId,
    accountNo: profile.accountNo,
    nickname: profile.nickname,
    avatarUrl: profile.avatarUrl,
    mobile: profile.mobile,
    status: profile.status,
    lastLoginAt: profile.lastLoginAt,
  };
}

@Controller('identity/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly platformDataService: PlatformDataService,
  ) {}

  @Public()
  @Get('status')
  getStatus() {
    return this.authService.getStatus();
  }

  @Public()
  @Get('anonymous')
  createAnonymousSession(): Promise<AuthSessionResponse> {
    return this.authService.issueAnonymousToken();
  }

  @Get('me')
  async getMe(@CurrentUser() user: AuthUser): Promise<AuthProfileResponse> {
    const profile = await this.platformDataService.getUserProfile(user);
    return {
      user: buildProfileUser(user, profile),
      canUseGuest: user.role === RoleCode.GUEST,
      profile,
    };
  }

  @Patch('me')
  async updateMe(@CurrentUser() user: AuthUser, @Body() body: Record<string, unknown>): Promise<AuthProfileResponse> {
    const profile = await this.platformDataService.updateUserProfile(user, body);
    return {
      user: buildProfileUser(user, profile),
      canUseGuest: user.role === RoleCode.GUEST,
      profile,
    };
  }

  @Post('refresh')
  refreshToken(@CurrentUser() user: AuthUser): Promise<AuthSessionResponse> {
    return this.authService.refreshSessionToken(user);
  }

  @Roles(RoleCode.USER, RoleCode.MERCHANT, RoleCode.LEADER)
  @Post('switch-role')
  switchRole(
    @CurrentUser() user: AuthUser,
    @Body() body: Record<string, unknown>,
  ): Promise<AuthSessionResponse> {
    const targetRole = String(body.role ?? '').trim().toUpperCase();
    if (!targetRole || !Object.values(RoleCode).includes(targetRole as RoleCode)) {
      throw new BadRequestException('Invalid target role');
    }
    return this.authService.switchRole(user, targetRole as RoleCode);
  }

  @Public()
  @Post('wechat/login')
  loginWithWechat(@Body() body: Record<string, unknown>): Promise<AuthSessionResponse> {
    return this.authService.issueWechatToken(body);
  }

  @Public()
  @Post('wechat/phone-bind')
  bindWechatPhone(@Body() body: Record<string, unknown>): Promise<AuthSessionResponse> {
    return this.authService.bindWechatPhone(body);
  }

  @Public()
  @Post('wechat/phone-login')
  loginWithWechatPhone(@Body() body: Record<string, unknown>): Promise<AuthSessionResponse> {
    return this.authService.loginWithWechatPhone(body);
  }

  @Public()
  @Post('wechat/sms-login')
  loginWithWechatSms(@Body() body: Record<string, unknown>): Promise<AuthSessionResponse> {
    return this.authService.loginWithWechatSms(body);
  }
}
