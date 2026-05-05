import { Global, Module } from '@nestjs/common';
import { LoggerModule } from './logger/logger.module';
import { PrismaModule } from './prisma/prisma.module';

// SharedModule (@Global) — single import surface for all shared infra.
//
// Current PR (PR 2 / 7): Prisma + Logger
// Future PRs:
//   PR 3 — CommonModule (DTO / Pipe / Filter / Interceptor / Decorator / utils)
//   PR 4 — Auth (JWT strategy + Guards)
//   PR 5 — AuditModule + SseHubModule + HealthModule
@Global()
@Module({
  imports: [PrismaModule, LoggerModule],
  exports: [PrismaModule, LoggerModule],
})
export class SharedModule {}
