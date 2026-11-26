import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { LoginDto, RegisterDto } from './auth.dto.js';
import { AuthThrottleGuard } from './auth-throttle.guard.js';
import {
  SessionGuard,
  CurrentUser,
  type AuthenticatedUser,
  type SessionRequest,
} from './session.guard.js';
@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}
  @Post('register')
  @UseGuards(AuthThrottleGuard)
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }
  @Post('login')
  @HttpCode(200)
  @UseGuards(AuthThrottleGuard)
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }
  @Get('me')
  @UseGuards(SessionGuard)
  me(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }
  @Post('logout')
  @HttpCode(204)
  @UseGuards(SessionGuard)
  async logout(@Req() request: SessionRequest) {
    await this.auth.logout(request.sessionId);
  }
}
