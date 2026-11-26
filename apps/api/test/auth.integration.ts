import 'dotenv/config';
import { Test } from '@nestjs/testing';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { spawnSync } from 'node:child_process';
import { MonitorsModule } from '../src/monitors/monitors.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { hashToken } from '../src/auth/auth.service.js';

describe('Authentication and tenant isolation', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let owner: ReturnType<typeof request.agent>;
  let other: ReturnType<typeof request.agent>;
  let ownerId: string;
  let otherId: string;
  let ownerToken: string;
  let email: string;
  const password = 'abc123';
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
    email = `owner-${Date.now()}@example.com`;
    const a = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: email.toUpperCase(), password })
      .expect(201);
    ownerId = a.body.user.id as string;
    ownerToken = a.body.token as string;
    expect(a.body.user.email).toBe(email);
    expect(a.body.user.passwordHash).toBeUndefined();
    const b = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: `other-${Date.now()}@example.com`, password })
      .expect(201);
    otherId = b.body.user.id as string;
    owner = request
      .agent(app.getHttpServer())
      .set('Authorization', `Bearer ${ownerToken}`);
    other = request
      .agent(app.getHttpServer())
      .set('Authorization', `Bearer ${b.body.token}`);
  });
  afterAll(async () => {
    if (prisma)
      await prisma.user.deleteMany({
        where: { id: { in: [ownerId, otherId].filter(Boolean) } },
      });
    if (app) await app.close();
  });
  it('stores password and session hashes, rejects wrong credentials and revokes logout', async () => {
    const stored = await prisma.user.findUniqueOrThrow({
      where: { id: ownerId },
    });
    expect(stored.passwordHash).not.toBe(password);
    expect(stored.passwordHash).toContain(':');
    const session = await prisma.session.findUniqueOrThrow({
      where: { tokenHash: hashToken(ownerToken) },
    });
    expect(session.tokenHash).not.toBe(ownerToken);
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'wrong-password' })
      .expect(401);
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'short@example.com', password: '12345' })
      .expect(400);
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password })
      .expect(409);
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);
    const token = login.body.token as string;
    await request(app.getHttpServer())
      .get('/auth/me')
      .auth(token, { type: 'bearer' })
      .expect(200);
    await request(app.getHttpServer())
      .post('/auth/logout')
      .auth(token, { type: 'bearer' })
      .expect(204);
    await request(app.getHttpServer())
      .get('/auth/me')
      .auth(token, { type: 'bearer' })
      .expect(401);
  });
  it('protects every monitor operation and never exposes or mutates another user records', async () => {
    const config = {
      name: 'Private API',
      url: 'https://example.com',
      interval: 60,
      timeout: 5,
    };
    const created = await owner.post('/monitors').send(config).expect(201);
    const id = created.body.id as string;
    await prisma.check.create({
      data: {
        monitorId: id,
        status: 'ONLINE',
        responseTime: 1,
        httpStatus: 200,
      },
    });
    expect((await other.get('/monitors').expect(200)).body).toEqual([]);
    for (const path of [
      `/monitors/${id}`,
      `/monitors/${id}/checks`,
      `/monitors/${id}/summary`,
    ])
      await other.get(path).expect(404);
    await other
      .put(`/monitors/${id}`)
      .send({ ...config, name: 'Stolen' })
      .expect(404);
    await other.patch(`/monitors/${id}`).send({ enabled: false }).expect(404);
    await other.delete(`/monitors/${id}`).expect(404);
    await other
      .post('/monitors')
      .send({ ...config, userId: ownerId })
      .expect(400);
    for (const path of [
      '/monitors',
      `/monitors/${id}`,
      `/monitors/${id}/checks`,
      `/monitors/${id}/summary`,
    ])
      await request(app.getHttpServer()).get(path).expect(401);
    await request(app.getHttpServer())
      .post('/monitors')
      .send(config)
      .expect(401);
    await request(app.getHttpServer())
      .put(`/monitors/${id}`)
      .send(config)
      .expect(401);
    await request(app.getHttpServer())
      .patch(`/monitors/${id}`)
      .send({ enabled: false })
      .expect(401);
    await request(app.getHttpServer()).delete(`/monitors/${id}`).expect(401);
    expect((await owner.get(`/monitors/${id}`).expect(200)).body).toMatchObject(
      { name: config.name, enabled: true },
    );
  });
  it('expires sessions and hides legacy monitors without an owner', async () => {
    const legacy = await prisma.monitor.create({
      data: {
        name: 'Legacy',
        url: 'https://example.com',
        interval: 60,
        timeout: 5,
      },
    });
    try {
      expect(
        (await owner.get('/monitors').expect(200)).body.some(
          (monitor: { id: string }) => monitor.id === legacy.id,
        ),
      ).toBe(false);
      await owner.get(`/monitors/${legacy.id}`).expect(404);
      await owner.delete(`/monitors/${legacy.id}`).expect(404);
      const claim = spawnSync(
        process.execPath,
        ['scripts/claim-monitors.mjs', email],
        { encoding: 'utf8', timeout: 10000 },
      );
      expect(claim.status, claim.stderr).toBe(0);
      expect(claim.stdout).toContain('1 monitores antigos atribuídos');
      await owner.get(`/monitors/${legacy.id}`).expect(200);
      await other.get(`/monitors/${legacy.id}`).expect(404);
      const again = spawnSync(
        process.execPath,
        ['scripts/claim-monitors.mjs', email],
        { encoding: 'utf8', timeout: 10000 },
      );
      expect(again.status, again.stderr).toBe(0);
      expect(again.stdout).toContain('0 monitores antigos atribuídos');
      const session = await prisma.session.findUniqueOrThrow({
        where: { tokenHash: hashToken(ownerToken) },
      });
      await prisma.session.update({
        where: { id: session.id },
        data: { expiresAt: new Date(0) },
      });
      await owner.get('/monitors').expect(401);
    } finally {
      await prisma.monitor.deleteMany({ where: { id: legacy.id } });
    }
  });
});
