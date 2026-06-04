import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { WhatsappService } from './whatsapp.service';
import { WhatsappTemplateDto } from './dto/whatsapp-template.dto';

@Controller('whatsapp')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WhatsappController {
  constructor(private whatsapp: WhatsappService) {}

  @Get('templates')
  templates() { return this.whatsapp.templates(); }

  @Post('templates')
  @Roles(Role.OWNER, Role.MANAGER)
  createTemplate(@Body() dto: WhatsappTemplateDto, @CurrentUser() user: any) { return this.whatsapp.createTemplate(dto, user.sub); }

  @Patch('templates/:id')
  @Roles(Role.OWNER, Role.MANAGER)
  updateTemplate(@Param('id') id: string, @Body() dto: Partial<WhatsappTemplateDto>, @CurrentUser() user: any) { return this.whatsapp.updateTemplate(id, dto, user.sub); }

  @Post('open-url')
  openUrl(@Body() body: { phone: string; message: string; leadId?: string }, @CurrentUser() user: any) {
    return this.whatsapp.createAndLogUrl(body.phone, body.message, user.sub, body.leadId);
  }
}
