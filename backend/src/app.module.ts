import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { SharedModule } from './shared/shared.module';

@Module({
  imports: [
    ConfigModule,
    SharedModule,
    // Future units register here:
    // U1: AuthModule, UsersModule
    // U2: IdeasModule
    // U3: ScoresModule
    // U4: DashboardModule
    // U5: RecognitionModule
    // U6: AdminModule, CyclesModule
  ],
})
export class AppModule {}
