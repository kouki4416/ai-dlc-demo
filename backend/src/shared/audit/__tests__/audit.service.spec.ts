import { AuditService } from '../audit.service';
import { AuditAction } from '../audit.types';

describe('AuditService', () => {
  const mockAuditLog = {
    create: jest.fn(),
    findMany: jest.fn(),
  };
  const prisma = { auditLog: mockAuditLog } as never;
  const service = new AuditService(prisma);

  beforeEach(() => {
    mockAuditLog.create.mockReset();
    mockAuditLog.findMany.mockReset();
  });

  it('writes an audit row through prisma.auditLog.create', async () => {
    mockAuditLog.create.mockResolvedValue({ id: 'log-1' });
    const row = await service.log({
      action: AuditAction.IDEA_PUBLISH,
      userId: 'u1',
      targetType: 'Idea',
      targetId: 'i1',
      metadata: { title: 'x' },
    });
    expect(mockAuditLog.create).toHaveBeenCalledWith({
      data: {
        action: 'IDEA_PUBLISH',
        userId: 'u1',
        targetType: 'Idea',
        targetId: 'i1',
        metadata: { title: 'x' },
      },
    });
    expect(row.id).toBe('log-1');
  });

  it('logSafe swallows underlying errors', async () => {
    mockAuditLog.create.mockRejectedValue(new Error('db down'));
    await expect(
      service.logSafe({
        action: AuditAction.USER_LOGIN,
        userId: 'u1',
      }),
    ).resolves.toBeUndefined();
  });

  it('findMany returns rows with constraints applied', async () => {
    mockAuditLog.findMany.mockResolvedValue([{ id: 'a' }]);
    const rows = await service.findMany({ userId: 'u1', take: 10 });
    expect(rows).toEqual([{ id: 'a' }]);
    const callArgs = mockAuditLog.findMany.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(callArgs.where).toEqual({ userId: 'u1' });
    expect(callArgs.take).toBe(10);
  });
});
