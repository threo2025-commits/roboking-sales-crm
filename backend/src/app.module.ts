import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './database/prisma.module';
import { UsersModule } from './users/users.module';
import { LeadsModule } from './leads/leads.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ImportsModule } from './imports/imports.module';
import { FilesModule } from './files/files.module';
import { CallsModule } from './calls/calls.module';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { EmailModule } from './email/email.module';
import { ChatModule } from './chat/chat.module';
import { ReportsModule } from './reports/reports.module';
import { FollowupsModule } from './followups/followups.module';
import { DealsModule } from './deals/deals.module';
import { HealthController } from './health.controller';
import { CommonModule } from './common/common.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { SettingsModule } from './settings/settings.module';
import { TasksModule } from './tasks/tasks.module';
import { ClientsModule } from './clients/clients.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    CommonModule,
    AuthModule,
    UsersModule,
    LeadsModule,
    DashboardModule,
    ImportsModule,
    FilesModule,
    CallsModule,
    WhatsappModule,
    EmailModule,
    ChatModule,
    ReportsModule,
    FollowupsModule,
    DealsModule,
    ClientsModule,
    TasksModule,
    SettingsModule,
    AuditLogsModule,
    NotificationsModule
  ],
  controllers: [HealthController]
})
export class AppModule {}
