import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CreateFollowupDto } from './dto/create-followup.dto';

type AuthUser = { sub: string; role: Role };

function startOfDay(d = new Date()) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function endOfDay(d = new Date()) { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; }

@Injectable()
export class FollowupsService {
  constructor(private prisma: PrismaService) {}

  private canAssignOthers(user: AuthUser) { return ['OWNER', 'MANAGER', 'PA_ADMIN_ASSISTANT'].includes(user.role); }

  async create(dto: CreateFollowupDto, user: AuthUser) {
    const assignedToId = this.canAssignOthers(user) ? (dto.assignedToId || user.sub) : user.sub;
    if (!this.canAssignOthers(user) && dto.leadId) {
      const lead = await this.prisma.lead.findFirst({ where: { id: dto.leadId, OR: [{ assignedToId: user.sub }, { createdById: user.sub }] } });
      if (!lead) throw new ForbiddenException('You can create follow-ups only for your own/assigned leads');
    }
    const followup = await this.prisma.followup.create({
      data: { leadId: dto.leadId, dealId: dto.dealId, assignedToId, title: dto.title, notes: dto.notes, dueAt: new Date(dto.dueAt) }
    });
    await this.prisma.auditLog.create({ data: { actorId: user.sub, action: 'CREATE_FOLLOWUP', entity: 'Followup', entityId: followup.id } });
    return followup;
  }

  dailyDashboard(user: AuthUser) {
    const unrestricted = ['OWNER', 'MANAGER', 'PA_ADMIN_ASSISTANT'].includes(user.role);
    const where: any = { dueAt: { gte: startOfDay(), lte: endOfDay() }, ...(unrestricted ? {} : { assignedToId: user.sub }) };
    return this.prisma.followup.findMany({ where, include: { lead: true, assignedTo: { select: { id: true, name: true, loginId: true, role: true } } }, orderBy: { dueAt: 'asc' } });
  }

  pending(user: AuthUser) {
    const unrestricted = ['OWNER', 'MANAGER', 'PA_ADMIN_ASSISTANT'].includes(user.role);
    return this.prisma.followup.findMany({ where: { status: 'PENDING', ...(unrestricted ? {} : { assignedToId: user.sub }) }, include: { lead: true, assignedTo: { select: { id: true, name: true, loginId: true } } }, orderBy: { dueAt: 'asc' }, take: 100 });
  }

  async updateStatus(id: string, status: 'PENDING' | 'COMPLETED' | 'MISSED' | 'CANCELLED', user: AuthUser) {
    const unrestricted = ['OWNER', 'MANAGER', 'PA_ADMIN_ASSISTANT'].includes(user.role);
    const followup = await this.prisma.followup.findFirst({ where: { id, ...(unrestricted ? {} : { assignedToId: user.sub }) } });
    if (!followup) throw new NotFoundException('Follow-up not found or not allowed');
    const updated = await this.prisma.followup.update({ where: { id }, data: { status } });
    await this.prisma.auditLog.create({ data: { actorId: user.sub, action: 'UPDATE_FOLLOWUP_STATUS', entity: 'Followup', entityId: id, metadata: { status } } });
    return updated;
  }

  async reschedule(id: string, dueAt: string, user: AuthUser) {
    const unrestricted = ['OWNER', 'MANAGER', 'PA_ADMIN_ASSISTANT'].includes(user.role);
    const followup = await this.prisma.followup.findFirst({ where: { id, ...(unrestricted ? {} : { assignedToId: user.sub }) } });
    if (!followup) throw new NotFoundException('Follow-up not found or not allowed');
    const updated = await this.prisma.followup.update({ where: { id }, data: { dueAt: new Date(dueAt), status: 'PENDING' } });
    await this.prisma.auditLog.create({ data: { actorId: user.sub, action: 'RESCHEDULE_FOLLOWUP', entity: 'Followup', entityId: id, metadata: { dueAt } } });
    return updated;
  }
}
