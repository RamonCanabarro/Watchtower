import {
  Inject,
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { CreateMonitorDto } from './dto/create-monitor.dto/create-monitor.dto.js';
import { UpdateMonitorDto } from './dto/update-monitor.dto.js';
import { MonitorsService } from './monitors.service.js';

@Controller('monitors')
export class MonitorsController {
  constructor(
    @Inject(MonitorsService) private readonly monitorsService: MonitorsService,
  ) {}
  @Get() findAll() {
    return this.monitorsService.findAll();
  }
  @Post() create(@Body() dto: CreateMonitorDto) {
    return this.monitorsService.create(dto);
  }
  @Get(':id') findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.monitorsService.findOne(id);
  }
  @Get(':id/checks') history(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    if (limit < 1 || limit > 100)
      throw new BadRequestException('limit deve estar entre 1 e 100.');
    return this.monitorsService.history(id, limit);
  }
  @Get(':id/summary') summary(@Param('id', ParseUUIDPipe) id: string) {
    return this.monitorsService.summary(id);
  }
  @Patch(':id') setEnabled(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMonitorDto,
  ) {
    return this.monitorsService.setEnabled(id, dto.enabled);
  }
}
