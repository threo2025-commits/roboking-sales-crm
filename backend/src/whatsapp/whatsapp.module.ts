import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappService } from './whatsapp.service';

@Module({ imports: [JwtModule.register({})], controllers: [WhatsappController], providers: [WhatsappService] })
export class WhatsappModule {}
