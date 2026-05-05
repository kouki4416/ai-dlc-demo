import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a route as publicly accessible — JwtAuthGuard will skip auth.
 * Useful for /health, /api/auth/login, /api/auth/register.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
