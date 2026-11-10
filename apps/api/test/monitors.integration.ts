import 'dotenv/config';
import { Test } from '@nestjs/testing';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { createServer, type Server } from 'node:http';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { MonitorsModule } from '../src/monitors/monitors.module.js';
import { WorkerService } from '../src/monitoring/worker.service.js';
import { MonitorsService } from '../src/monitors/monitors.service.js';

describe('Persisted monitoring lifecycle', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let server: Server;
  let target: string;
  let id: string | undefined;
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [MonitorsModule],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    prisma = app.get(PrismaService);
    server = createServer((_req, res) => {
      res.writeHead(200);
      res.end('ok');
    });
    await new Promise<void>((resolve) =>
      server.listen(0, '127.0.0.1', resolve),
    );
    const address = server.address();
    if (!address || typeof address === 'string')
      throw new Error('Missing test address');
    target = `http://127.0.0.1:${address.port}`;
  });
  afterAll(async () => {
    if (id) await prisma.monitor.deleteMany({ where: { id } });
    if (server)
      await new Promise<void>((resolve) => server.close(() => resolve()));
    if (app) await app.close();
  });
  it('creates, survives a fresh client, checks exactly once across workers, summarizes and pauses', async () => {
    await request(app.getHttpServer())
      .post('/monitors')
      .send({ name: 'Bad', url: 'ftp://example.com', interval: 1, timeout: 60 })
      .expect(400);
    const response = await request(app.getHttpServer())
      .post('/monitors')
      .send({ name: 'Integration test', url: target, interval: 60, timeout: 1 })
      .expect(201);
    id = response.body.id as string;
    const fresh = new PrismaService();
    await fresh.$connect();
    try {
      expect(
        (await fresh.monitor.findUniqueOrThrow({ where: { id } })).name,
      ).toBe('Integration test');
    } finally {
      await fresh.$disconnect();
    }
    const workerA = new WorkerService(prisma);
    const workerB = new WorkerService(prisma);
    const original = process.env.ALLOW_PRIVATE_TARGETS;
    process.env.ALLOW_PRIVATE_TARGETS = 'true';
    try {
      await Promise.all([workerA.tick(), workerB.tick()]);
    } finally {
      if (original === undefined) delete process.env.ALLOW_PRIVATE_TARGETS;
      else process.env.ALLOW_PRIVATE_TARGETS = original;
    }
    const history = await request(app.getHttpServer())
      .get(`/monitors/${id}/checks`)
      .expect(200);
    expect(history.body).toHaveLength(1);
    expect(history.body[0]).toMatchObject({
      status: 'ONLINE',
      httpStatus: 200,
    });
    const summary = await request(app.getHttpServer())
      .get(`/monitors/${id}/summary`)
      .expect(200);
    expect(summary.body).toMatchObject({
      total: 1,
      successful: 1,
      uptime: 100,
    });
    await request(app.getHttpServer())
      .get(`/monitors/${id}/checks?limit=1000`)
      .expect(400);
    await request(app.getHttpServer())
      .patch(`/monitors/${id}`)
      .send({ enabled: false })
      .expect(200);
    const paused = await prisma.monitor.findUniqueOrThrow({ where: { id } });
    expect(paused.enabled).toBe(false);
    await prisma.monitor.update({
      where: { id },
      data: { nextCheckAt: new Date(0) },
    });
    await workerA.tick();
    expect(await prisma.check.count({ where: { monitorId: id } })).toBe(1);
    await request(app.getHttpServer())
      .patch(`/monitors/${id}`)
      .send({ enabled: true })
      .expect(200);
    await prisma.monitor.update({
      where: { id },
      data: {
        nextCheckAt: new Date(0),
        leaseToken: '00000000-0000-4000-8000-000000000000',
        leaseUntil: new Date(0),
      },
    });
    process.env.ALLOW_PRIVATE_TARGETS = 'true';
    try {
      await workerA.tick();
    } finally {
      if (original === undefined) delete process.env.ALLOW_PRIVATE_TARGETS;
      else process.env.ALLOW_PRIVATE_TARGETS = original;
    }
    expect(await prisma.check.count({ where: { monitorId: id } })).toBe(2);
    const service = new MonitorsService(prisma);
    expect((await service.findAll()).some((monitor) => monitor.id === id)).toBe(
      true,
    );
  });
});
