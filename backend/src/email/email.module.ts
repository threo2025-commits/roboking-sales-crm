import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { FilesModule } from '../files/files.module';
import { EmailController } from './email.controller';
import { EmailService } from './email.service';
import { ImapService } from './imap.service';

@Module({ imports: [JwtModule.register({}), FilesModule], controllers: [EmailController], providers: [EmailService, ImapService] })
export class EmailModule {}
