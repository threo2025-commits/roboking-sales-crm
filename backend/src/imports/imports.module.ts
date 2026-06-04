import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { LeadsModule } from '../leads/leads.module';
import { ImportsController } from './imports.controller';
import { ImportsService } from './imports.service';

@Module({ imports: [JwtModule.register({}), LeadsModule], controllers: [ImportsController], providers: [ImportsService] })
export class ImportsModule {}
