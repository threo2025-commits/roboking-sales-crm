import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { SettingsService } from './settings.service';

@Controller('settings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SettingsController {
  constructor(private settings: SettingsService) {}

  @Get()
  @Roles(Role.OWNER, Role.MANAGER)
  list() { return this.settings.list(); }

  @Post()
  @Roles(Role.OWNER, Role.MANAGER)
  upsert(@Body() body: { key: string; value: string }, @CurrentUser() user: any) {
    return this.settings.upsert(body.key, body.value, user.sub);
  }
}
