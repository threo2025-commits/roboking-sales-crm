import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';

@Module({ imports: [JwtModule.register({})], controllers: [ClientsController], providers: [ClientsService] })
export class ClientsModule {}
