import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { SessionGuard } from './session.guard.js';
import { AuthThrottleGuard } from './auth-throttle.guard.js';
@Module({
  imports: [PrismaModule],
  controllers: [AuthController],
  providers: [AuthService, SessionGuard, AuthThrottleGuard],
  exports: [SessionGuard, AuthService],
})
export class AuthModule {}
