import { RoleCode } from '../enums/role.enum';
import { TokenType } from '../enums/token-type.enum';

export type AuthUser = {
  sub: string;
  role: RoleCode;
  tokenType: TokenType;
};
