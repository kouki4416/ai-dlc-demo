import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import type { AuthUser } from '../types/auth-user';

/**
 * Pulls the authenticated user (set by JwtStrategy.validate) off the request.
 *
 * Example: `someRoute(@CurrentUser() user: AuthUser) { ... }`
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser | undefined => {
    const req = ctx.switchToHttp().getRequest<{ user?: AuthUser }>();
    return req.user;
  },
);
