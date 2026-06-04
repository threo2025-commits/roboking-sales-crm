import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Priority, Role } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';

type AuthUser = { sub: string; role: Role };

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}

  private canAssignOthers(user: AuthUser): boolean { return ['OWNER', 'MANAGER', 'PA_ADMIN_ASSISTANT'].includes(user.role); }

  list(user: AuthUser) {
    const unrestricted = this.canAssignOthers(user);
    return this.prisma.task.findMany({
      where: unrestricted ? {} : { assignedToId: user.sub },
      include: { assignedTo: { select: { id: true, name: true, loginId: true, role: true } }, createdBy: { select: { id: true, name: true } }, lead: true, deal: true },
      orderBy: [{ status: 'asc' }, { dueAt: 'asc' }],
      take: 200
    });
  }

  async create(dto: CreateTaskDto, user: AuthUser) {
    const assignedToId = this.canAssignOthers(user) ? (dto.assignedToId || user.sub) : user.sub;
    const task = await this.prisma.task.create({
      data: { title: dto.title, description: dto.description, assignedToId, createdById: user.sub, leadId: dto.leadId, dealId: dto.dealId, priority: dto.priority ?? Priority.MEDIUM, dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined }
    });
    await this.prisma.auditLog.create({ data: { actorId: user.sub, action: 'CREATE_TASK', entity: 'Task', entityId: task.id } });
    return task;
  }

  async markDone(id: string, user: AuthUser) {
    const existing = await this.prisma.task.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Task not found');
    if (!this.canAssignOthers(user) && existing.assignedToId !== user.sub && existing.createdById !== user.sub) throw new ForbiddenException('Permission denied');
    const task = await this.prisma.task.update({ where: { id }, data: { status: 'DONE', completedAt: new Date() } });
    await this.prisma.auditLog.create({ data: { actorId: user.sub, action: 'COMPLETE_TASK', entity: 'Task', entityId: id } });
    return task;
  }
}
