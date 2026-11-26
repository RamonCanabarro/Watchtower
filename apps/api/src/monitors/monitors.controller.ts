import {
  Inject,
  Body,
  Controller,
  Delete,
  HttpCode,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Put,
  Post,
  Query,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { CreateMonitorDto } from './dto/create-monitor.dto/create-monitor.dto.js';
import { UpdateMonitorDto } from './dto/update-monitor.dto.js';
import { MonitorsService } from './monitors.service.js';
import {
  SessionGuard,
  CurrentUser,
  type AuthenticatedUser,
} from '../auth/session.guard.js';
@Controller('monitors')
@UseGuards(SessionGuard)
export class MonitorsController {
  constructor(
    @Inject(MonitorsService) private readonly monitorsService: MonitorsService,
  ) {}
  @Get() findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.monitorsService.findAll(user.id);
  }
  @Post() create(
    @Body() dto: CreateMonitorDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.monitorsService.create(dto, user.id);
  }
  @Get(':id') findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.monitorsService.findOne(id, user.id);
  }
  @Get(':id/checks') history(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (limit < 1 || limit > 100)
      throw new BadRequestException('limit deve estar entre 1 e 100.');
    return this.monitorsService.history(id, user.id, limit);
  }
  @Get(':id/summary') summary(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.monitorsService.summary(id, user.id);
  }
  @Delete(':id')
  @HttpCode(204)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.monitorsService.remove(id, user.id);
  }
  @Put(':id') update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateMonitorDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.monitorsService.update(id, dto, user.id);
  }
  @Patch(':id') setEnabled(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMonitorDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.monitorsService.setEnabled(id, dto.enabled, user.id);
  }
}
