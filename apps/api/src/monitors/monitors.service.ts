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

  create(dto: CreateMonitorDto, userId: string) {
    return this.prisma.monitor.create({
      data: {
        userId,
        name: dto.name,
        url: dto.url,
        interval: dto.interval,
        timeout: dto.timeout,
      },
      ...latestCheck,
    });
  }

  findAll(userId: string) {
    return this.prisma.monitor.findMany({
      where: { userId },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      ...latestCheck,
    });
  }

  async findOne(id: string, userId: string) {
    const monitor = await this.prisma.monitor.findUnique({
      where: { id, userId },
      ...latestCheck,
    });
    if (!monitor) throw new NotFoundException('Monitor não encontrado.');
    return monitor;
  }

  async history(id: string, userId: string, limit = 50) {
    await this.findOne(id, userId);
    return this.prisma.check.findMany({
      where: { monitorId: id, monitor: { userId } },
      orderBy: [{ checkedAt: 'desc' }, { id: 'desc' }],
      take: limit,
    });
  }

  async summary(id: string, userId: string) {
    const monitor = await this.findOne(id, userId);
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const where = {
      monitorId: id,
      monitor: { userId },
      checkedAt: { gte: since },
    };
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

  async remove(id: string, userId: string): Promise<void> {
    // The foreign key removes the checks in the same database operation.
    const result = await this.prisma.monitor.deleteMany({
      where: { id, userId },
    });
    if (!result.count) throw new NotFoundException('Monitor não encontrado.');
  }

  async update(id: string, dto: CreateMonitorDto, userId: string) {
    const result = await this.prisma.monitor.updateMany({
      where: { id, userId },
      data: {
        name: dto.name,
        url: dto.url,
        interval: dto.interval,
        timeout: dto.timeout,
        nextCheckAt: new Date(),
      },
    });
    if (!result.count) throw new NotFoundException('Monitor não encontrado.');
    return this.findOne(id, userId);
  }

  async setEnabled(id: string, enabled: boolean, userId: string) {
    await this.findOne(id, userId);
    // updateMany allows deletion between the lookup and the write without exposing a Prisma error.
    const result = await this.prisma.monitor.updateMany({
      where: { id, userId },
      data: { enabled, nextCheckAt: new Date() },
    });
    if (!result.count) throw new NotFoundException('Monitor não encontrado.');
    return this.findOne(id, userId);
  }
}
