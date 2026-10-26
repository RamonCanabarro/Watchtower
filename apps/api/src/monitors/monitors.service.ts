import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { CreateMonitorDto } from './dto/create-monitor.dto/create-monitor.dto.js';

type Monitor = CreateMonitorDto & {
    id: string;
    createdAt: string;
    updatedAt: string;
    enabled: boolean;
};

@Injectable()
export class MonitorsService {
    private monitors: Monitor[] = [];

    create(dto: CreateMonitorDto) {
        const now = new Date().toISOString();

        const monitor: Monitor = {
            ...dto,
            id: randomUUID(),
            createdAt: now,
            updatedAt: now,
            enabled: true,
        };

        this.monitors.push(monitor);

        return monitor;
    }

    findAll() {
        return this.monitors;
    }
}