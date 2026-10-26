import { Body, Controller, Get, Post } from '@nestjs/common';
import { CreateMonitorDto } from './dto/create-monitor.dto/create-monitor.dto.js';
import { MonitorsService } from './monitors.service.js';

@Controller('monitors')
export class MonitorsController {
  constructor(private readonly monitorsService: MonitorsService) {}

  @Get()
  findAll() {
    return this.monitorsService.findAll();
  }

  @Post()
  create(@Body() createMonitorDto: CreateMonitorDto) {
    return this.monitorsService.create(createMonitorDto);
  }
}