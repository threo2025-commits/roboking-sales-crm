import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import type { RequestMeta } from '../common/decorators/request-meta.decorator';
import { UpdateDealStageDto } from './dto/update-deal-stage.dto';
import { CreateDealDto } from './dto/create-deal.dto';

type AuthUser = { sub: string; role: Role };

@Injectable()
export class DealsService {
  constructor(private prisma: PrismaService) {}

  private unrestricted(user: AuthUser) { return ['OWNER', 'MANAGER'].includes(user.role); }

  list(user: AuthUser) {
    return this.prisma.deal.findMany({
      where: this.unrestricted(user) ? {} : { assignedToId: user.sub },
      include: { lead: true, client: true, callLogs: { include: { recordingFile: true, employee: { select: { id: true, name: true } }, client: true, lead: true }, orderBy: { createdAt: 'desc' }, take: 5 } },
      orderBy: { updatedAt: 'desc' },
      take: 200
    });
  }

  async create(dto: CreateDealDto, user: AuthUser) {
    const assignedToId = this.unrestricted(user) ? (dto.assignedToId || user.sub) : user.sub;
    if (!this.unrestricted(user) && dto.leadId) {
      const lead = await this.prisma.lead.findFirst({ where: { id: dto.leadId, OR: [{ assignedToId: user.sub }, { createdById: user.sub }] } });
      if (!lead) throw new ForbiddenException('You can create deals only for your own/assigned leads');
    }
    const deal = await this.prisma.deal.create({
      data: { title: dto.title, leadId: dto.leadId, clientId: dto.clientId, assignedToId, expectedValue: dto.expectedValue, probability: dto.probability || 0, nextFollowupAt: dto.nextFollowupAt ? new Date(dto.nextFollowupAt) : undefined }
    });
    await this.prisma.activity.create({ data: { type: 'NOTE', summary: 'Deal created', userId: user.sub, dealId: deal.id, leadId: dto.leadId, clientId: dto.clientId } });
    return deal;
  }

  async updateStage(dto: UpdateDealStageDto, user: AuthUser, meta?: RequestMeta) {
    const existing = await this.prisma.deal.findUnique({ where: { id: dto.dealId } });
    if (!existing) throw new NotFoundException('Deal not found');
    if (!this.unrestricted(user) && existing.assignedToId !== user.sub) throw new ForbiddenException('Permission denied');
    const deal = await this.prisma.deal.update({ where: { id: dto.dealId }, data: { stage: dto.stage } });
    await this.prisma.activity.create({ data: { type: 'NOTE', summary: `Deal moved to ${dto.stage}`, details: dto.note, userId: user.sub, dealId: deal.id } });
    await this.prisma.auditLog.create({
      data: {
        actorId: user.sub, actorRole: user.role, action: 'UPDATE_DEAL_STAGE', entity: 'Deal', entityId: deal.id,
        entityName: deal.title, ipAddress: meta?.ipAddress, userAgent: meta?.userAgent,
        beforeState: { stage: existing.stage }, afterState: { stage: deal.stage }, notes: dto.note
      }
    });
    return deal;
  }
}
