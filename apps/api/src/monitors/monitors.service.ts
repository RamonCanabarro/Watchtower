import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateMonitorDto } from './dto/create-monitor.dto/create-monitor.dto.js';

const latestCheck = {
  omit: { leaseToken: true, leaseUntil: true, nextCheckAt: true } as const,
  include: { checks: { orderBy: { checkedAt: 'desc' as const }, take: 1 } },
};

@Injectable()
export class MonitorsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  create(dto: CreateMonitorDto) {
    return this.prisma.monitor.create({
      data: {
        name: dto.name,
        url: dto.url,
        interval: dto.interval,
        timeout: dto.timeout,
      },
      ...latestCheck,
    });
  }

  findAll() {
    return this.prisma.monitor.findMany({
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      ...latestCheck,
    });
  }

  async findOne(id: string) {
    const monitor = await this.prisma.monitor.findUnique({
      where: { id },
      ...latestCheck,
    });
    if (!monitor) throw new NotFoundException('Monitor não encontrado.');
    return monitor;
  }

  async history(id: string, limit = 50) {
    await this.findOne(id);
    return this.prisma.check.findMany({
      where: { monitorId: id },
      orderBy: [{ checkedAt: 'desc' }, { id: 'desc' }],
      take: limit,
    });
  }

  async summary(id: string) {
    const monitor = await this.findOne(id);
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const where = { monitorId: id, checkedAt: { gte: since } };
    const [total, successful, average] = await this.prisma.$transaction(
      [
        this.prisma.check.count({ where }),
        this.prisma.check.count({ where: { ...where, status: 'ONLINE' } }),
        this.prisma.check.aggregate({
          where: { ...where, status: 'ONLINE' },
          _avg: { responseTime: true },
        }),
      ],
      { isolationLevel: 'RepeatableRead' },
    );
    return {
      monitor,
      total,
      successful,
      uptime: total === 0 ? null : (successful / total) * 100,
      averageResponseTime: average._avg.responseTime,
      windowHours: 24,
    };
  }

  async setEnabled(id: string, enabled: boolean) {
    await this.findOne(id);
    // updateMany allows deletion between the lookup and the write without exposing a Prisma error.
    const result = await this.prisma.monitor.updateMany({
      where: { id },
      data: { enabled, nextCheckAt: new Date() },
    });
    if (!result.count) throw new NotFoundException('Monitor não encontrado.');
    return this.findOne(id);
  }
}
