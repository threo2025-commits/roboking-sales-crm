import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { LeadStatus, Role } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import type { RequestMeta } from '../common/decorators/request-meta.decorator';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { UpdateLeadStageDto } from './dto/update-lead-stage.dto';

type AuthUser = { sub: string; role: Role };

@Injectable()
export class LeadsService {
  constructor(private prisma: PrismaService) {}

  private unrestricted(user: AuthUser) {
    return ['OWNER', 'MANAGER'].includes(user.role);
  }

  private async audit(
    user: AuthUser,
    meta: RequestMeta | undefined,
    data: {
      action: string;
      entityId: string;
      entityName: string;
      beforeState?: Record<string, unknown>;
      afterState?: Record<string, unknown>;
      notes?: string;
      metadata?: Record<string, unknown>;
    }
  ) {
    await this.prisma.auditLog.create({
      data: {
        actorId: user.sub,
        actorRole: user.role,
        action: data.action,
        entity: 'Lead',
        entityId: data.entityId,
        entityName: data.entityName,
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
        beforeState: data.beforeState as any,
        afterState: data.afterState as any,
        notes: data.notes,
        metadata: data.metadata as any
      }
    });
  }

  async findDuplicate(dto: Pick<CreateLeadDto, 'phone' | 'email'>) {
    if (!dto.phone && !dto.email) return null;
    const conditions = [dto.phone ? { phone: dto.phone } : undefined, dto.email ? { email: dto.email } : undefined].filter(Boolean) as any[];
    const lead = await this.prisma.lead.findFirst({ where: { deletedAt: null, OR: conditions } });
    if (lead) return { type: 'LEAD', ...lead } as any;

    const contact = await this.prisma.contact.findFirst({
      where: { OR: conditions },
      include: { client: { select: { id: true, organization: true } } }
    });
    if (!contact) return null;
    return {
      type: 'CONTACT',
      id: contact.id,
      clientId: contact.clientId,
      organization: contact.client.organization,
      phone: contact.phone,
      email: contact.email
    } as any;
  }

  async create(dto: CreateLeadDto, user: AuthUser, options?: { sourceImportId?: string; requestMeta?: RequestMeta }) {
    const duplicate = await this.findDuplicate(dto);
    const canOverride = ['OWNER', 'MANAGER'].includes(user.role) && dto.allowDuplicateOverride;
    if (duplicate && !canOverride) {
      throw new BadRequestException({
        code: 'DUPLICATE_CONTACT_FOUND',
        message: 'Duplicate contact found',
        duplicateLeadId: duplicate.type === 'LEAD' ? duplicate.id : undefined,
        duplicateContactId: duplicate.type === 'CONTACT' ? duplicate.id : undefined,
        duplicateOrganization: duplicate.organization,
        duplicatePhone: duplicate.phone,
        duplicateEmail: duplicate.email
      });
    }

    const lead = await this.prisma.lead.create({
      data: {
        title: dto.organization,
        organization: dto.organization,
        contactName: dto.contactName,
        phone: dto.phone,
        whatsapp: dto.whatsapp,
        email: dto.email,
        city: dto.city,
        state: dto.state,
        requirement: dto.requirement,
        source: dto.source,
        priority: dto.priority || 'MEDIUM',
        status: dto.status || 'NEW_LEAD',
        expectedValue: dto.expectedValue,
        assignedToId: dto.assignedToId || user.sub,
        createdById: user.sub,
        nextFollowupAt: dto.nextFollowupAt ? new Date(dto.nextFollowupAt) : undefined,
        duplicateOfId: duplicate?.type === 'LEAD' ? duplicate.id : undefined,
        duplicateReason: duplicate ? `Owner/Manager override used for duplicate ${duplicate.type.toLowerCase()}` : undefined,
        sourceImportId: options?.sourceImportId
      }
    });

    await this.prisma.activity.create({ data: { type: 'NOTE', summary: 'Lead created', userId: user.sub, leadId: lead.id } });
    await this.prisma.leadAssignmentHistory.create({
      data: { leadId: lead.id, toUserId: lead.assignedToId, changedById: user.sub, note: 'Initial lead assignment' }
    });
    await this.audit(user, options?.requestMeta, {
      action: 'CREATE_LEAD',
      entityId: lead.id,
      entityName: lead.organization,
      afterState: { status: lead.status, assignedToId: lead.assignedToId }
    });
    return lead;
  }

  async list(user: AuthUser) {
    const unrestricted = this.unrestricted(user);
    return this.prisma.lead.findMany({
      where: unrestricted ? {} : { deletedAt: null, OR: [{ assignedToId: user.sub }, { createdById: user.sub }] },
      include: {
        assignedTo: { select: { id: true, name: true, role: true } },
        createdBy: { select: { id: true, name: true, role: true } },
        client: { select: { id: true, organization: true } },
        deals: { select: { id: true, title: true, stage: true, expectedValue: true, probability: true, updatedAt: true }, orderBy: { updatedAt: 'desc' }, take: 1 },
        activities: {
          select: { type: true, summary: true, details: true, createdAt: true, user: { select: { id: true, name: true, role: true } } },
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        callLogs: {
          select: { createdAt: true, status: true, productInterest: true, budgetDiscussed: true, summary: true, employee: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        emailMessages: {
          select: { createdAt: true, sentAt: true, subject: true, senderUser: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        whatsappLogs: {
          select: { createdAt: true, message: true, employee: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: [{ deletedAt: 'desc' }, { createdAt: 'desc' }],
      take: 200
    });
  }


  async get(id: string, user: AuthUser) {
    const unrestricted = this.unrestricted(user);
    const lead = await this.prisma.lead.findFirst({
      where: { id, ...(unrestricted ? {} : { deletedAt: null, OR: [{ assignedToId: user.sub }, { createdById: user.sub }] }) },
      include: {
        assignedTo: { select: { id: true, name: true, loginId: true, role: true } },
        createdBy: { select: { id: true, name: true, loginId: true, role: true } },
        client: true,
        deals: true,
        followups: { include: { assignedTo: { select: { id: true, name: true, role: true } } }, orderBy: { dueAt: 'asc' } },
        tasks: {
          include: {
            assignedTo: { select: { id: true, name: true, role: true } },
            createdBy: { select: { id: true, name: true, role: true } }
          },
          orderBy: { createdAt: 'desc' }
        },
        activities: { include: { user: { select: { id: true, name: true, role: true } } }, orderBy: { createdAt: 'desc' }, take: 50 },
        assignmentHistory: {
          include: {
            fromUser: { select: { id: true, name: true, role: true } },
            toUser: { select: { id: true, name: true, role: true } },
            changedBy: { select: { id: true, name: true, role: true } }
          },
          orderBy: { createdAt: 'desc' }
        },
        callLogs: { include: { recordingFile: true, employee: { select: { id: true, name: true, role: true } } }, orderBy: { createdAt: 'desc' } },
        emailMessages: {
          select: {
            id: true, leadId: true, senderUserId: true, fromEmail: true, toEmail: true, cc: true,
            subject: true, bodyHtml: true, bodyText: true, direction: true, providerMsgId: true,
            threadKey: true, sentAt: true, receivedAt: true, createdAt: true,
            senderUser: { select: { id: true, name: true, role: true } }
          },
          orderBy: { createdAt: 'desc' },
          take: 50
        },
        whatsappLogs: { include: { employee: { select: { id: true, name: true, role: true } } }, orderBy: { createdAt: 'desc' }, take: 50 }
      }
    });
    if (!lead) throw new NotFoundException('Lead not found');
    const auditLogs = await this.prisma.auditLog.findMany({
      where: { entity: 'Lead', entityId: id },
      include: { actor: { select: { id: true, name: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100
    });
    return {
      ...lead,
      auditLogs: auditLogs.map((log) => unrestricted ? log : { ...log, ipAddress: undefined, userAgent: undefined }),
      lastContact: this.lastContact(lead)
    };
  }

  async update(id: string, dto: UpdateLeadDto, user: AuthUser, meta?: RequestMeta) {
    const existing = await this.prisma.lead.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Lead not found');
    const unrestricted = this.unrestricted(user);
    if (existing.deletedAt && !unrestricted) throw new NotFoundException('Lead not found');
    if (!unrestricted && existing.assignedToId !== user.sub && existing.createdById !== user.sub) throw new ForbiddenException('Permission denied');
    if (!unrestricted && dto.assignedToId !== undefined && dto.assignedToId !== existing.assignedToId) {
      throw new ForbiddenException('Only Owner/Manager can reassign leads');
    }
    const lead = await this.prisma.lead.update({ where: { id }, data: { ...dto, title: dto.organization || existing.title, nextFollowupAt: dto.nextFollowupAt ? new Date(dto.nextFollowupAt) : undefined } as any });
    await this.prisma.activity.create({ data: { type: 'NOTE', summary: 'Lead updated', userId: user.sub, leadId: lead.id } });
    if (dto.assignedToId !== undefined && dto.assignedToId !== existing.assignedToId) {
      await this.prisma.leadAssignmentHistory.create({
        data: { leadId: id, fromUserId: existing.assignedToId, toUserId: dto.assignedToId, changedById: user.sub, note: 'Lead reassigned' }
      });
    }
    await this.audit(user, meta, {
      action: dto.assignedToId !== undefined && dto.assignedToId !== existing.assignedToId ? 'REASSIGN_LEAD' : 'UPDATE_LEAD',
      entityId: id,
      entityName: lead.organization,
      beforeState: { status: existing.status, assignedToId: existing.assignedToId, nextFollowupAt: existing.nextFollowupAt },
      afterState: { status: lead.status, assignedToId: lead.assignedToId, nextFollowupAt: lead.nextFollowupAt }
    });
    return lead;
  }

  async updateStage(id: string, dto: UpdateLeadStageDto, user: AuthUser, meta?: RequestMeta) {
    const existing = await this.prisma.lead.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) throw new NotFoundException('Lead not found');
    if (!this.unrestricted(user) && existing.assignedToId !== user.sub && existing.createdById !== user.sub) {
      throw new ForbiddenException('Permission denied');
    }
    if (dto.status === LeadStatus.FOLLOW_UP_LATER && !dto.nextFollowupAt) {
      throw new BadRequestException('Next follow-up date is required');
    }
    if (dto.status === LeadStatus.CONVERTED) return this.convertToClient(id, user, meta, dto.note);

    const updated = await this.prisma.lead.update({
      where: { id },
      data: {
        status: dto.status,
        nextFollowupAt: dto.nextFollowupAt ? new Date(dto.nextFollowupAt) : existing.nextFollowupAt
      }
    });
    await this.prisma.activity.create({
      data: { type: 'NOTE', summary: `Lead moved from ${existing.status} to ${updated.status}`, details: dto.note, userId: user.sub, leadId: id }
    });
    await this.audit(user, meta, {
      action: 'UPDATE_LEAD_STAGE',
      entityId: id,
      entityName: existing.organization,
      beforeState: { status: existing.status, nextFollowupAt: existing.nextFollowupAt },
      afterState: { status: updated.status, nextFollowupAt: updated.nextFollowupAt },
      notes: dto.note
    });
    return updated;
  }

  async addNote(id: string, note: string, user: AuthUser, meta?: RequestMeta) {
    const text = note?.trim();
    if (!text) throw new BadRequestException('Note is required');
    const existing = await this.prisma.lead.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) throw new NotFoundException('Lead not found');
    if (!this.unrestricted(user) && existing.assignedToId !== user.sub && existing.createdById !== user.sub) {
      throw new ForbiddenException('Permission denied');
    }
    const activity = await this.prisma.activity.create({
      data: { type: 'NOTE', summary: 'Note added', details: text, userId: user.sub, leadId: id }
    });
    await this.audit(user, meta, {
      action: 'ADD_LEAD_NOTE',
      entityId: id,
      entityName: existing.organization,
      notes: text
    });
    return activity;
  }

  async softDelete(id: string, user: AuthUser, meta?: RequestMeta) {
    const existing = await this.prisma.lead.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Lead not found');
    if (existing.deletedAt) return existing;

    const lead = await this.prisma.lead.update({
      where: { id },
      data: { deletedAt: new Date(), deletedById: user.sub }
    });
    await this.prisma.activity.create({ data: { type: 'NOTE', summary: 'Lead marked deleted', userId: user.sub, leadId: lead.id } });
    await this.audit(user, meta, { action: 'DELETE_LEAD', entityId: lead.id, entityName: lead.organization, beforeState: { deletedAt: null }, afterState: { deletedAt: lead.deletedAt } });
    return lead;
  }

  async convertToClient(id: string, user: AuthUser, meta?: RequestMeta, note?: string) {
    const lead = await this.get(id, user);
    if (lead.deletedAt) throw new BadRequestException('Deleted leads cannot be converted');
    let clientId = lead.clientId;
    if (!clientId) {
      const client = await this.prisma.client.create({
        data: {
          organization: lead.organization, city: lead.city, state: lead.state, source: lead.source, createdById: user.sub, notes: lead.requirement,
          contacts: lead.contactName || lead.phone || lead.email ? { create: { name: lead.contactName || 'Primary Contact', phone: lead.phone, whatsapp: lead.whatsapp, email: lead.email } } : undefined
        }
      });
      clientId = client.id;
    }
    const updated = await this.prisma.lead.update({ where: { id }, data: { clientId, status: 'CONVERTED' } });
    await this.prisma.deal.upsert({
      where: { id: `${id}-deal` },
      update: { clientId, stage: 'CONVERTED' },
      create: { id: `${id}-deal`, leadId: id, clientId, title: lead.organization, stage: 'CONVERTED', expectedValue: lead.expectedValue, assignedToId: lead.assignedToId }
    }).catch(() => this.prisma.deal.create({ data: { leadId: id, clientId, title: lead.organization, stage: 'CONVERTED', expectedValue: lead.expectedValue, assignedToId: lead.assignedToId } }));
    await this.prisma.activity.create({ data: { type: 'NOTE', summary: 'Lead converted to client', userId: user.sub, leadId: id, clientId } });
    await this.audit(user, meta, {
      action: 'CONVERT_LEAD',
      entityId: id,
      entityName: lead.organization,
      beforeState: { status: lead.status, clientId: lead.clientId },
      afterState: { status: 'CONVERTED', clientId },
      notes: note
    });
    return updated;
  }

  async duplicateWarnings() {
    return this.prisma.lead.findMany({ where: { duplicateReason: { not: null } }, orderBy: { createdAt: 'desc' }, take: 50 });
  }

  private lastContact(lead: any) {
    const contacts = [
      ...(lead.callLogs || []).map((item: any) => ({ type: 'CALL', at: item.createdAt, by: item.employee })),
      ...(lead.emailMessages || []).map((item: any) => ({ type: 'EMAIL', at: item.sentAt || item.receivedAt || item.createdAt, by: item.senderUser })),
      ...(lead.whatsappLogs || []).map((item: any) => ({ type: 'WHATSAPP', at: item.createdAt, by: item.employee }))
    ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
    return contacts[0] || null;
  }
}
