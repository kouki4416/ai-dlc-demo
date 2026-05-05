import { ArgumentsHost, BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { GlobalExceptionFilter } from '../global-exception.filter';

function buildHost(req: { url?: string; originalUrl?: string }) {
  const status = jest.fn().mockReturnThis();
  const json = jest.fn().mockReturnThis();
  const response = { status, json };
  const ctx = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => req,
    }),
  } as unknown as ArgumentsHost;
  return { ctx, status, json };
}

describe('GlobalExceptionFilter', () => {
  const filter = new GlobalExceptionFilter();

  it('maps an HttpException to its status with the original message', () => {
    const { ctx, status, json } = buildHost({ url: '/api/v1/test' });
    filter.catch(new BadRequestException('bad params'), ctx);
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalled();
    const body = (json.mock.calls[0]?.[0] ?? {}) as Record<string, unknown>;
    expect(body.statusCode).toBe(400);
    expect(body.path).toBe('/api/v1/test');
    expect(body.message).toBe('bad params');
  });

  it('maps an HttpException with object payload', () => {
    const { ctx, json } = buildHost({ url: '/x' });
    filter.catch(new NotFoundException({ message: 'gone', code: 'ABSENT' }), ctx);
    const body = (json.mock.calls[0]?.[0] ?? {}) as Record<string, unknown>;
    expect(body.statusCode).toBe(404);
    expect(body.code).toBe('ABSENT');
  });

  it('maps Prisma P2002 (unique constraint) to 409 CONFLICT', () => {
    const { ctx, status, json } = buildHost({ url: '/x' });
    const err = new Prisma.PrismaClientKnownRequestError('unique', {
      code: 'P2002',
      clientVersion: 'test',
    });
    filter.catch(err, ctx);
    expect(status).toHaveBeenCalledWith(409);
    const body = (json.mock.calls[0]?.[0] ?? {}) as Record<string, unknown>;
    expect(body.code).toBe('UNIQUE_VIOLATION');
  });

  it('maps Prisma P2025 (record not found) to 404', () => {
    const { ctx, status } = buildHost({ url: '/x' });
    const err = new Prisma.PrismaClientKnownRequestError('missing', {
      code: 'P2025',
      clientVersion: 'test',
    });
    filter.catch(err, ctx);
    expect(status).toHaveBeenCalledWith(404);
  });

  it('falls back to 500 for unknown errors', () => {
    const { ctx, status, json } = buildHost({ url: '/x' });
    filter.catch(new Error('boom'), ctx);
    expect(status).toHaveBeenCalledWith(500);
    const body = (json.mock.calls[0]?.[0] ?? {}) as Record<string, unknown>;
    expect(body.code).toBe('INTERNAL_ERROR');
  });

  it('uses originalUrl when present', () => {
    const { ctx, json } = buildHost({ url: '/x', originalUrl: '/api/v1/x' });
    filter.catch(new BadRequestException('e'), ctx);
    const body = (json.mock.calls[0]?.[0] ?? {}) as Record<string, unknown>;
    expect(body.path).toBe('/api/v1/x');
  });
});
