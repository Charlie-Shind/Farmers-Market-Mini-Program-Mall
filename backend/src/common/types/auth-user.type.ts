import { RoleCode } from '../enums/role.enum';
import { TokenType } from '../enums/token-type.enum';

export type AuthUser = {
  sub: string;
  role: RoleCode;
  tokenType: TokenType;
  /** 商户后台账号绑定的商户 ID；平台管理员无此字段 */
  merchantId?: number | null;
  accountType?: 'PLATFORM' | 'MERCHANT';
};
