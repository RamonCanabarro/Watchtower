import 'dotenv/config';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module.js';
import { WorkerService } from './monitoring/worker.service.js';

@Module({ imports: [PrismaModule], providers: [WorkerService] })
class WorkerModule {}
const app = await NestFactory.createApplicationContext(WorkerModule);
app.enableShutdownHooks();
