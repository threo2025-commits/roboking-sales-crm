import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreateClientDto } from './dto/create-client.dto';
import { ClientsService } from './clients.service';

@Controller('clients')
@UseGuards(JwtAuthGuard)
export class ClientsController {
  constructor(private clients: ClientsService) {}

  @Get()
  list(@CurrentUser() user: any) { return this.clients.list(user); }

  @Get(':id')
  get(@Param('id') id: string, @CurrentUser() user: any) { return this.clients.get(id, user); }

  @Post()
  create(@Body() dto: CreateClientDto, @CurrentUser() user: any) { return this.clients.create(dto, user); }
}
