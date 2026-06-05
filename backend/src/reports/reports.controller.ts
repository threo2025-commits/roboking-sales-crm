import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private reports: ReportsService) {}

  @Get('available')
  available() { return this.reports.available(); }

  @Get('overview')
  overview(@CurrentUser() user: any) { return this.reports.overview(user); }

  @Get('monthly-export')
  @Roles(Role.OWNER, Role.MANAGER)
  async monthlyExport(@Query('month') month: string, @CurrentUser() user: any, @Res() response: Response) {
    const csv = await this.reports.monthlyExport(user, month);
    response.setHeader('Content-Type', 'text/csv; charset=utf-8');
    response.setHeader('Content-Disposition', `attachment; filename="roboking-crm-${month}.csv"`);
    response.send(csv);
  }
}
