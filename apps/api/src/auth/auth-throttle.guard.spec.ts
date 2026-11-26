import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ExecutionContext } from '@nestjs/common';
import { AuthThrottleGuard } from './auth-throttle.guard.js';
describe('Credential throttling', () => {
  afterEach(() => vi.useRealTimers());
  it('limits each IP and allows attempts again after the window expires', () => {
    vi.useFakeTimers();
    const context = {
      switchToHttp: () => ({ getRequest: () => ({ ip: '127.0.0.1' }) }),
    } as unknown as ExecutionContext;
    const guard = new AuthThrottleGuard();
    for (let i = 0; i < 10; i++) expect(guard.canActivate(context)).toBe(true);
    expect(() => guard.canActivate(context)).toThrow('Muitas tentativas.');
    vi.advanceTimersByTime(60001);
    expect(guard.canActivate(context)).toBe(true);
  });
});
