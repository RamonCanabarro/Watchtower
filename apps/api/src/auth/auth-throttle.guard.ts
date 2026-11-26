import {
  HttpException,
  HttpStatus,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import type { Request } from 'express';
@Injectable()
export class AuthThrottleGuard implements CanActivate {
  private readonly attempts = new Map<
    string,
    { count: number; until: number }
  >();
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    const ip = request.ip ?? request.socket.remoteAddress ?? 'unknown';
    const email = (request.body as { email?: unknown } | undefined)?.email;
    const accountKey = `${ip}:${typeof email === 'string' ? email.trim().toLowerCase().slice(0, 254) : ''}`;
    const now = Date.now();
    // Bound memory and discard expired buckets. Only credential endpoints use this guard.
    for (const [key, value] of this.attempts)
      if (value.until <= now) this.attempts.delete(key);
    const bucket = this.attempts.get(accountKey) ?? {
      count: 0,
      until: now + 60000,
    };
    if (
      bucket.count >= 10 ||
      (!this.attempts.has(accountKey) && this.attempts.size >= 10000)
    ) {
      throw new HttpException(
        'Muitas tentativas. Aguarde um minuto.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    bucket.count++;
    this.attempts.set(accountKey, bucket);
    return true;
  }
}
