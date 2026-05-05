import { Global, Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { SseController } from './sse.controller';
import { SseHubService } from './sse-hub.service';

@Global()
@Module({
  imports: [CommonModule],
  controllers: [SseController],
  providers: [SseHubService],
  exports: [SseHubService],
})
export class SseModule {}
