import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { RoleCode } from '../../../common/enums/role.enum';
import { TokenType } from '../../../common/enums/token-type.enum';
import { AuthUser } from '../../../common/types/auth-user.type';
import { requireConfigValue } from '../../../common/utils/config';

function normalizeRoleCode(value: unknown): RoleCode | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toUpperCase();
  return Object.values(RoleCode).includes(normalized as RoleCode) ? (normalized as RoleCode) : null;
}

function normalizeTokenType(value: unknown): TokenType | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  return Object.values(TokenType).includes(normalized as TokenType) ? (normalized as TokenType) : null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: requireConfigValue(configService, 'JWT_SECRET'),
    });
  }

  validate(payload: Record<string, unknown>): AuthUser {
    const sub = typeof payload.sub === 'string' ? payload.sub.trim() : '';
    const role = normalizeRoleCode(payload.role);
    const tokenType = normalizeTokenType(payload.tokenType) ?? (role === RoleCode.GUEST ? TokenType.GUEST : TokenType.ACCESS);

    if (!sub || !role) {
      throw new UnauthorizedException('Invalid token payload');
    }

    const merchantIdRaw = payload.merchantId;
    const merchantId =
      typeof merchantIdRaw === 'number' && Number.isFinite(merchantIdRaw)
        ? merchantIdRaw
        : typeof merchantIdRaw === 'string' && merchantIdRaw.trim()
          ? Number(merchantIdRaw)
          : null;
    const accountType = payload.accountType === 'MERCHANT' || (merchantId != null && !Number.isNaN(merchantId))
      ? 'MERCHANT'
      : 'PLATFORM';

    return {
      sub,
      role,
      tokenType,
      merchantId: merchantId != null && !Number.isNaN(merchantId) ? merchantId : null,
      accountType,
    };
  }
}
