import { Injectable, Logger } from '@nestjs/common';
import type { AuditLog, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AuditEvent } from './audit.types';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(event: AuditEvent): Promise<AuditLog> {
    return this.prisma.auditLog.create({
      data: {
        action: event.action,
        userId: event.userId ?? null,
        targetType: event.targetType ?? null,
        targetId: event.targetId ?? null,
        metadata: (event.metadata ?? null) as Prisma.InputJsonValue | null,
      },
    });
  }

  async logSafe(event: AuditEvent): Promise<void> {
    try {
      await this.log(event);
    } catch (err) {
      this.logger.error(
        { err, action: event.action, targetType: event.targetType, targetId: event.targetId },
        'Failed to write audit log',
      );
    }
  }

  findMany(args: {
    userId?: string;
    action?: string;
    targetType?: string;
    skip?: number;
    take?: number;
  }): Promise<AuditLog[]> {
    return this.prisma.auditLog.findMany({
      where: {
        ...(args.userId ? { userId: args.userId } : {}),
        ...(args.action ? { action: args.action } : {}),
        ...(args.targetType ? { targetType: args.targetType } : {}),
      },
      orderBy: { createdAt: 'desc' },
      skip: args.skip,
      take: args.take ?? 50,
    });
  }
}
