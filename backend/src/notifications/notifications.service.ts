import { ForbiddenException, Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CreateNotificationDto } from './dto/create-notification.dto';

type AuthUser = { sub: string; role: Role };

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  list(user: AuthUser) {
    return this.prisma.notification.findMany({ where: { OR: [{ userId: user.sub }, { userId: null }] }, orderBy: { createdAt: 'desc' }, take: 100 });
  }

  async create(dto: CreateNotificationDto, user: AuthUser) {
    if (!['OWNER', 'MANAGER', 'PA_ADMIN_ASSISTANT'].includes(user.role)) {
      throw new ForbiddenException('Only Owner, Manager, or PA can send reminders/notifications');
    }
    const note = await this.prisma.notification.create({
      data: { userId: dto.userId || null, title: dto.title, body: dto.body }
    });
    await this.prisma.auditLog.create({ data: { actorId: user.sub, action: 'CREATE_NOTIFICATION', entity: 'Notification', entityId: note.id, metadata: { to: dto.userId || 'ALL' } } });
    return note;
  }

  async unreadCount(user: AuthUser) {
    return this.prisma.notification.count({ where: { readAt: null, OR: [{ userId: user.sub }, { userId: null }] } });
  }

  async markRead(id: string, user: AuthUser) {
    return this.prisma.notification.updateMany({ where: { id, OR: [{ userId: user.sub }, { userId: null }] }, data: { readAt: new Date() } });
  }
}
