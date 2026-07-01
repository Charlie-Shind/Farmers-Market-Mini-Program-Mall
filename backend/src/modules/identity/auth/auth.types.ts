import { AuthUser } from '../../../common/types/auth-user.type';
import { TokenType } from '../../../common/enums/token-type.enum';

export type AuthSessionUser = AuthUser & {
  userId?: number;
  accountNo?: string;
  nickname?: string;
  avatarUrl?: string;
  mobile?: string;
  status?: number;
  lastLoginAt?: string;
};

export type AuthSessionResponse = {
  tokenType: TokenType;
  accessToken: string;
  tokenPrefix: 'Bearer';
  expiresIn: string;
  user: AuthSessionUser;
};

export type AuthProfileResponse = {
  user: AuthSessionUser & {
    status: number;
    lastLoginAt: string;
  };
  canUseGuest: boolean;
  profile: {
    userId: number;
    accountNo: string;
    openid: string;
    nickname: string;
    avatarUrl: string;
    mobile: string;
    status: number;
    lastLoginAt: string;
  };
};
