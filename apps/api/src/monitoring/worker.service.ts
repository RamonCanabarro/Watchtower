import {
  Inject,
  Injectable,
  Logger,
  type OnModuleInit,
  type OnModuleDestroy,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { checkHttp } from './http-check.js';

@Injectable()
export class WorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WorkerService.name);
  private timer?: ReturnType<typeof setTimeout>;
  private stopping = false;
  private active: Promise<void> = Promise.resolve();
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  onModuleInit() {
    this.schedule(0);
  }
  private schedule(delay: number) {
    if (this.stopping) return;
    this.timer = setTimeout(() => {
      this.active = this.tick()
        .catch((error: unknown) => {
          this.logger.error(
            error instanceof Error ? error.message : 'Worker failed',
          );
        })
        .finally(() => this.schedule(1000));
    }, delay);
  }
  async onModuleDestroy() {
    this.stopping = true;
    clearTimeout(this.timer);
    await this.active;
  }

  async tick() {
    // Database time avoids clock differences between worker processes.
    const [clock] = await this.prisma.$queryRaw<
      { now: Date }[]
    >`SELECT clock_timestamp() AT TIME ZONE 'UTC' AS now`;
    const now = clock!.now;
    const monitors = await this.prisma.monitor.findMany({
      where: {
        enabled: true,
        nextCheckAt: { lte: now },
        OR: [{ leaseUntil: null }, { leaseUntil: { lt: now } }],
      },
      orderBy: [{ nextCheckAt: 'asc' }, { id: 'asc' }],
      take: 5,
    });
    const outcomes = await Promise.allSettled(
      monitors.map(async (monitor) => {
        const token = randomUUID();
        const claim = await this.prisma.monitor.updateMany({
          where: {
            id: monitor.id,
            enabled: true,
            nextCheckAt: { lte: now },
            OR: [{ leaseUntil: null }, { leaseUntil: { lt: now } }],
          },
          data: {
            leaseToken: token,
            leaseUntil: new Date(now.getTime() + 60000),
          },
        });
        if (!claim.count) return;
        const result = await checkHttp(
          monitor.url,
          monitor.timeout,
          process.env.ALLOW_PRIVATE_TARGETS === 'true',
        );
        await this.prisma.$transaction(async (tx) => {
          const [clock] = await tx.$queryRaw<
            { now: Date }[]
          >`SELECT clock_timestamp() AT TIME ZONE 'UTC' AS now`;
          const completedAt = clock!.now;
          const released = await tx.monitor.updateMany({
            where: {
              id: monitor.id,
              leaseToken: token,
              leaseUntil: { gte: completedAt },
            },
            data: {
              leaseUntil: null,
              leaseToken: null,
              nextCheckAt: new Date(
                completedAt.getTime() + monitor.interval * 1000,
              ),
            },
          });
          if (released.count)
            await tx.check.create({
              data: {
                monitorId: monitor.id,
                checkedAt: completedAt,
                ...result,
              },
            });
        });
      }),
    );
    for (const outcome of outcomes) {
      if (outcome.status === 'rejected')
        this.logger.error(
          'Could not complete a check. Its lease will expire before retry.',
        );
    }
  }
}
