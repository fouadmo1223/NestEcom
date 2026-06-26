import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getAppStatus() {
    return { message: 'Your app is working' };
  }
}
