import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({ imports: [JwtModule.register({})], controllers: [TasksController], providers: [TasksService] })
export class TasksModule {}
