import { Body, Controller, Get, Param, Patch, Post, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { SendEmailDto } from './dto/send-email.dto';
import { EmailTemplateDto } from './dto/email-template.dto';
import { EmailService } from './email.service';
import { ImapService } from './imap.service';

@Controller('email')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EmailController {
  constructor(private email: EmailService, private imap: ImapService) {}

  @Get('templates')
  templates() { return this.email.templates(); }

  @Post('templates')
  @Roles(Role.OWNER, Role.MANAGER)
  createTemplate(@Body() dto: EmailTemplateDto, @CurrentUser() user: any) { return this.email.createTemplate(dto, user.sub); }

  @Patch('templates/:id')
  @Roles(Role.OWNER, Role.MANAGER)
  updateTemplate(@Param('id') id: string, @Body() dto: Partial<EmailTemplateDto>, @CurrentUser() user: any) { return this.email.updateTemplate(id, dto, user.sub); }

  @Get('messages')
  messages(@CurrentUser() user: any) { return this.email.messages(user); }

  @Post('send')
  @UseInterceptors(FilesInterceptor('attachments'))
  send(@Body() dto: SendEmailDto, @UploadedFiles() attachments: Express.Multer.File[], @CurrentUser() user: any) {
    return this.email.send(dto, user.sub, user.role, attachments || []);
  }

  @Post('sync-inbox')
  sync(@CurrentUser() user: any) { return this.imap.syncUserInbox(user.sub); }
}
