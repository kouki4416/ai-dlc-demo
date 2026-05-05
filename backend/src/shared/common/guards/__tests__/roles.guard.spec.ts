import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { RolesGuard } from '../roles.guard';

function makeContext(user?: { role: UserRole }): ExecutionContext {
  const req = { user };
  return {
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  const reflector = {
    getAllAndOverride: jest.fn(),
  } as unknown as Reflector;
  const guard = new RolesGuard(reflector);

  beforeEach(() => {
    (reflector.getAllAndOverride as jest.Mock).mockReset();
  });

  it('passes when no @Roles is set', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(undefined);
    expect(guard.canActivate(makeContext({ role: UserRole.SUBMITTER }))).toBe(true);
  });

  it('rejects when no user is on the request', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue([UserRole.ADMIN]);
    expect(() => guard.canActivate(makeContext(undefined))).toThrow(ForbiddenException);
  });

  it('rejects when user role is not in required list', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue([UserRole.ADMIN]);
    expect(() => guard.canActivate(makeContext({ role: UserRole.SUBMITTER }))).toThrow(
      ForbiddenException,
    );
  });

  it('passes when user role matches one of the required', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue([UserRole.PANEL, UserRole.ADMIN]);
    expect(guard.canActivate(makeContext({ role: UserRole.PANEL }))).toBe(true);
  });
});
