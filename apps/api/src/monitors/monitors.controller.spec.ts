import { describe, it, expect, vi } from 'vitest';
import { MonitorsController } from './monitors.controller.js';
import { MonitorsService } from './monitors.service.js';
describe('MonitorsController', () => {
  it('bounds history requests', async () => {
    const history = vi.fn();
    const controller = new MonitorsController({
      history,
    } as unknown as MonitorsService);
    expect(() => controller.history('id', 101)).toThrow();
    expect(history).not.toHaveBeenCalled();
    await controller.history('id', 50);
    expect(history).toHaveBeenCalledWith('id', 50);
  });
});
