import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('health')
  @HttpCode(HttpStatus.OK)
  getHealth(): { status: string } {
    return { status: 'ok' };
  }
}
