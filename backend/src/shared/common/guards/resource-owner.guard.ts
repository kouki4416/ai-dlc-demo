import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Type,
  mixin,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthUser } from '../types/auth-user';

export interface ResourceOwnerGuardOptions {
  /** Prisma model to query (must have an `id` field and a foreign-key field). */
  model: 'idea' | 'score' | 'cycle';
  /** Field on the resource that points to the owning user. */
  ownerField: string;
  /** Route param (e.g., ':id') that holds the resource id. */
  paramName?: string;
  /** Roles that bypass ownership check (default: ADMIN only). */
  bypassRoles?: UserRole[];
}

/**
 * Guard factory: ensures `req.user.userId === resource[ownerField]`.
 * Admin (and configured bypass roles) skip the check.
 *
 * Example:
 *   @UseGuards(JwtAuthGuard, ResourceOwnerGuard({ model: 'idea', ownerField: 'submitterId' }))
 */
export function ResourceOwnerGuard(options: ResourceOwnerGuardOptions): Type<CanActivate> {
  const paramName = options.paramName ?? 'id';
  const bypassRoles = options.bypassRoles ?? [UserRole.ADMIN];

  @Injectable()
  class MixinResourceOwnerGuard implements CanActivate {
    constructor(public readonly prisma: PrismaService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
      const req = context.switchToHttp().getRequest<{
        user?: AuthUser;
        params: Record<string, string>;
      }>();

      const user = req.user;
      if (!user) {
        throw new ForbiddenException('Not authenticated');
      }
      if (bypassRoles.includes(user.role)) {
        return true;
      }

      const id = req.params[paramName];
      if (!id) {
        throw new ForbiddenException(`Missing route param: ${paramName}`);
      }

      // Type-narrowed accessor — keeps Prisma typings honest at the call site.
      const delegate = this.prisma[options.model] as unknown as {
        findUnique: (args: {
          where: { id: string };
          select: Record<string, true>;
        }) => Promise<Record<string, unknown> | null>;
      };

      const resource = await delegate.findUnique({
        where: { id },
        select: { [options.ownerField]: true },
      });

      if (!resource) {
        throw new NotFoundException(`${options.model} not found: ${id}`);
      }

      if (resource[options.ownerField] !== user.userId) {
        throw new ForbiddenException('Not the owner of this resource');
      }

      return true;
    }
  }

  return mixin(MixinResourceOwnerGuard);
}
