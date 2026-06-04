import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  health() {
    return { ok: true, service: 'roboking-sales-crm-api', timestamp: new Date().toISOString() };
  }
}
