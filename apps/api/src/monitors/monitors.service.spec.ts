import { describe, it, expect, vi } from 'vitest';
import { MonitorsService } from './monitors.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('MonitorsService', () => {
  it('persists explicitly allowed fields and lets Prisma supply defaults', async () => {
    const create = vi.fn().mockResolvedValue({ id: 'saved' });
    const prisma = { monitor: { create } } as unknown as PrismaService;
    const service = new MonitorsService(prisma);
    const input = {
      name: 'API',
      url: 'https://example.com',
      interval: 60.5,
      timeout: 1.5,
    };
    await expect(service.create(input)).resolves.toEqual({ id: 'saved' });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ data: input }),
    );
  });
  it('reports missing monitors', async () => {
    const prisma = {
      monitor: { findUnique: vi.fn().mockResolvedValue(null) },
    } as unknown as PrismaService;
    await expect(
      new MonitorsService(prisma).findOne('missing'),
    ).rejects.toThrow('Monitor não encontrado.');
  });
});
