import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { LeadsService } from './leads.service';

@Controller('leads')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LeadsController {
  constructor(private leads: LeadsService) {}

  @Get()
  list(@CurrentUser() user: any) { return this.leads.list(user); }

  @Get('duplicates')
  @Roles(Role.OWNER, Role.MANAGER)
  duplicates() { return this.leads.duplicateWarnings(); }

  @Get(':id')
  get(@Param('id') id: string, @CurrentUser() user: any) { return this.leads.get(id, user); }

  @Post()
  create(@Body() dto: CreateLeadDto, @CurrentUser() user: any) { return this.leads.create(dto, user); }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateLeadDto, @CurrentUser() user: any) { return this.leads.update(id, dto, user); }

  @Post(':id/convert-to-client')
  convert(@Param('id') id: string, @CurrentUser() user: any) { return this.leads.convertToClient(id, user); }
}
