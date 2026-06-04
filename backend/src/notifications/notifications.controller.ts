import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private notifications: NotificationsService) {}

  @Get()
  list(@CurrentUser() user: any) { return this.notifications.list(user); }

  @Get('unread-count')
  unreadCount(@CurrentUser() user: any) { return this.notifications.unreadCount(user); }

  @Post()
  create(@Body() dto: CreateNotificationDto, @CurrentUser() user: any) { return this.notifications.create(dto, user); }

  @Patch(':id/read')
  read(@Param('id') id: string, @CurrentUser() user: any) { return this.notifications.markRead(id, user); }
}
