import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { Public } from '../common/decorators/public.decorator';
import { PrismaHealthIndicator } from './prisma-health.indicator';

@ApiTags('health')
@Controller({ version: '1' })
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaIndicator: PrismaHealthIndicator,
  ) {}

  @Public()
  @Get('health')
  @HealthCheck()
  liveness() {
    return this.health.check([]);
  }

  @Public()
  @Get('health/ready')
  @HealthCheck()
  readiness() {
    return this.health.check([() => this.prismaIndicator.pingCheck('database')]);
  }

  @Public()
  @Get('health/db')
  @HealthCheck()
  database() {
    return this.health.check([() => this.prismaIndicator.pingCheck('database')]);
  }
}
