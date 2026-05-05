import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@prisma/client';

export const ROLES_KEY = 'roles';

/**
 * Restricts a route to the listed roles. Used together with RolesGuard.
 *
 * Example: `@Roles(UserRole.ADMIN)` or `@Roles(UserRole.PANEL, UserRole.ADMIN)`
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
