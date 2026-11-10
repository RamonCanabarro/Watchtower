import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { MonitorsModule } from './monitors/monitors.module.js';

@Module({
  imports: [MonitorsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
