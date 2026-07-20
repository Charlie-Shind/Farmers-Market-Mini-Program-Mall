import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';

import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  private isPublic(context: ExecutionContext): boolean {
    return Boolean(
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]),
    );
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.isPublic(context)) {
      // 公开接口也尝试解析登录态（可选鉴权）：带了有效 Token 就注入 request.user，
      // 无 Token / Token 无效也放行，保证匿名可访问。
      try {
        await Promise.resolve(super.canActivate(context) as boolean | Promise<boolean>);
      } catch {
        // 忽略鉴权失败，匿名访问
      }
      return true;
    }

    return Promise.resolve(super.canActivate(context) as boolean | Promise<boolean>);
  }

  handleRequest<TUser = unknown>(err: unknown, user: TUser, _info: unknown, context: ExecutionContext): TUser {
    if (this.isPublic(context)) {
      return (err ? null : user || null) as TUser;
    }

    if (err || !user) {
      throw err || new UnauthorizedException();
    }

    return user;
  }
}
