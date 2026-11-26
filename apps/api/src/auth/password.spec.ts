import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from './password.js';
describe('Password storage', () => {
  it('uses independent salts and verifies without storing plaintext', async () => {
    const password = 'A sufficiently long passphrase';
    const first = await hashPassword(password);
    const second = await hashPassword(password);
    expect(first).not.toBe(second);
    expect(await verifyPassword(password, first)).toBe(true);
    expect(await verifyPassword('incorrect', first)).toBe(false);
    expect(await verifyPassword(password, 'broken')).toBe(false);
  });
});
