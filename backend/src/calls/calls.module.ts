import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { FilesModule } from '../files/files.module';
import { CallsController } from './calls.controller';
import { CallsService } from './calls.service';

@Module({ imports: [JwtModule.register({}), FilesModule], controllers: [CallsController], providers: [CallsService] })
export class CallsModule {}
