// src/app.controller.ts
import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  getHealthCheck(): { status: string; timestamp: string } {
    return this.appService.getHealthCheck();
  }

  @Get('ping')
  @HttpCode(HttpStatus.OK)
  ping(): { message: string } {
    return { message: 'pong' };
  }
}
