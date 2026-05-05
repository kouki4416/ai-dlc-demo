import { Global, Module } from '@nestjs/common';
import { AuditModule } from './audit/audit.module';
import { CommonModule } from './common/common.module';
import { HealthModule } from './health/health.module';
import { LoggerModule } from './logger/logger.module';
import { PrismaModule } from './prisma/prisma.module';
import { SseModule } from './sse/sse.module';

// SharedModule (@Global) — single import surface for all shared infrastructure.
@Global()
@Module({
  imports: [
    PrismaModule,
    LoggerModule,
    CommonModule,
    AuditModule,
    SseModule,
    HealthModule,
  ],
  exports: [
    PrismaModule,
    LoggerModule,
    CommonModule,
    AuditModule,
    SseModule,
    HealthModule,
  ],
})
export class SharedModule {}
