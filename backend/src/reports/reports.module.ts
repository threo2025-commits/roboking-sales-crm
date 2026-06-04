import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({ imports: [JwtModule.register({})], controllers: [ReportsController], providers: [ReportsService] })
export class ReportsModule {}
