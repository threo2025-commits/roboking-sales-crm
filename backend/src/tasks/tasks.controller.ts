import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreateTaskDto } from './dto/create-task.dto';
import { TasksService } from './tasks.service';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private tasks: TasksService) {}

  @Get()
  list(@CurrentUser() user: any) { return this.tasks.list(user); }

  @Post()
  create(@Body() dto: CreateTaskDto, @CurrentUser() user: any) { return this.tasks.create(dto, user); }

  @Patch(':id/done')
  done(@Param('id') id: string, @CurrentUser() user: any) { return this.tasks.markDone(id, user); }
}
