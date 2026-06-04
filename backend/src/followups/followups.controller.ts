import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreateFollowupDto } from './dto/create-followup.dto';
import { FollowupsService } from './followups.service';

@Controller('followups')
@UseGuards(JwtAuthGuard)
export class FollowupsController {
  constructor(private followups: FollowupsService) {}

  @Get('daily')
  daily(@CurrentUser() user: any) { return this.followups.dailyDashboard(user); }

  @Get('pending')
  pending(@CurrentUser() user: any) { return this.followups.pending(user); }

  @Post()
  create(@Body() dto: CreateFollowupDto, @CurrentUser() user: any) { return this.followups.create(dto, user); }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() body: { status: 'PENDING' | 'COMPLETED' | 'MISSED' | 'CANCELLED' }, @CurrentUser() user: any) {
    return this.followups.updateStatus(id, body.status, user);
  }

  @Patch(':id/reschedule')
  reschedule(@Param('id') id: string, @Body() body: { dueAt: string }, @CurrentUser() user: any) {
    return this.followups.reschedule(id, body.dueAt, user);
  }
}
