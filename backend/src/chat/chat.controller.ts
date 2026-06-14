import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ChatService } from './chat.service';

@Controller('chat')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ChatController {
  constructor(private chat: ChatService) {}

  @Get('conversations')
  conversations(@CurrentUser() user: any) { return this.chat.conversations(user); }

  @Get('conversations/:id/messages')
  messages(@Param('id') id: string, @CurrentUser() user: any) { return this.chat.messages(id, user); }

  @Post('conversations/:id/read')
  markRead(@Param('id') id: string, @CurrentUser() user: any) { return this.chat.markRead(id, user); }

  @Post('groups')
  @Roles(Role.OWNER, Role.MANAGER)
  createGroup(@Body() body: { title: string; category?: string; memberIds: string[]; linkedLeadId?: string; linkedDealId?: string }, @CurrentUser() user: any) {
    return this.chat.createGroup(body.title, user.sub, body.memberIds, body.linkedLeadId, body.linkedDealId, body.category);
  }

  @Patch('groups/:id')
  @Roles(Role.OWNER, Role.MANAGER)
  updateGroup(@Param('id') id: string, @Body() body: { title?: string; category?: string; ownerId?: string }, @CurrentUser() user: any) {
    return this.chat.updateGroup(id, body, user);
  }

  @Post('groups/:id/members')
  @Roles(Role.OWNER, Role.MANAGER)
  addMembers(@Param('id') id: string, @Body() body: { memberIds: string[] }, @CurrentUser() user: any) {
    return this.chat.addMembers(id, body.memberIds, user);
  }

  @Delete('groups/:id/members/:userId')
  @Roles(Role.OWNER, Role.MANAGER)
  removeMember(@Param('id') id: string, @Param('userId') userId: string, @CurrentUser() user: any) {
    return this.chat.removeMember(id, userId, user);
  }

  @Delete('groups/:id')
  @Roles(Role.OWNER, Role.MANAGER)
  deleteGroup(@Param('id') id: string, @CurrentUser() user: any) {
    return this.chat.deleteGroup(id, user);
  }

  @Post('direct')
  createDirect(@Body() body: { memberId: string }, @CurrentUser() user: any) {
    return this.chat.createDirect(body.memberId, user);
  }

  @Post('messages')
  send(@Body() body: { conversationId: string; body: string }, @CurrentUser() user: any) { return this.chat.sendMessage(body.conversationId, user.sub, body.body, user.role); }
}
