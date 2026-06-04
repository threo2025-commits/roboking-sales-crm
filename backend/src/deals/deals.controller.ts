import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreateDealDto } from './dto/create-deal.dto';
import { DealsService } from './deals.service';
import { UpdateDealStageDto } from './dto/update-deal-stage.dto';

@Controller('deals')
@UseGuards(JwtAuthGuard)
export class DealsController {
  constructor(private deals: DealsService) {}

  @Get()
  list(@CurrentUser() user: any) { return this.deals.list(user); }

  @Post()
  create(@Body() dto: CreateDealDto, @CurrentUser() user: any) { return this.deals.create(dto, user); }

  @Post('stage')
  updateStage(@Body() dto: UpdateDealStageDto, @CurrentUser() user: any) { return this.deals.updateStage(dto, user); }
}
