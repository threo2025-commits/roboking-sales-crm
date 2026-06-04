import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';

type AuthUser = { sub: string; role: Role };

@Injectable()
export class LeadsService {
  constructor(private prisma: PrismaService) {}

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

  async create(dto: CreateLeadDto, user: AuthUser, options?: { sourceImportId?: string }) {
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
    return lead;
  }

  async list(user: AuthUser) {
    const unrestricted = ['OWNER', 'MANAGER'].includes(user.role);
    return this.prisma.lead.findMany({
      where: unrestricted ? {} : { deletedAt: null, OR: [{ assignedToId: user.sub }, { createdById: user.sub }] },
      orderBy: [{ deletedAt: 'desc' }, { createdAt: 'desc' }],
      take: 200
    });
  }


  async get(id: string, user: AuthUser) {
    const unrestricted = ['OWNER', 'MANAGER'].includes(user.role);
    const lead = await this.prisma.lead.findFirst({
      where: { id, ...(unrestricted ? {} : { deletedAt: null, OR: [{ assignedToId: user.sub }, { createdById: user.sub }] }) },
      include: { assignedTo: { select: { id: true, name: true, loginId: true, role: true } }, createdBy: { select: { id: true, name: true, loginId: true, role: true } }, client: true, deals: true, followups: { orderBy: { dueAt: 'asc' } }, activities: { orderBy: { createdAt: 'desc' }, take: 50 }, callLogs: { include: { recordingFile: true }, orderBy: { createdAt: 'desc' } }, emailMessages: { orderBy: { createdAt: 'desc' }, take: 50 }, whatsappLogs: { orderBy: { createdAt: 'desc' }, take: 50 } }
    });
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }

  async update(id: string, dto: UpdateLeadDto, user: AuthUser) {
    const existing = await this.prisma.lead.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Lead not found');
    const unrestricted = ['OWNER', 'MANAGER'].includes(user.role);
    if (existing.deletedAt && !unrestricted) throw new NotFoundException('Lead not found');
    if (!unrestricted && existing.assignedToId !== user.sub && existing.createdById !== user.sub) throw new ForbiddenException('Permission denied');
    const lead = await this.prisma.lead.update({ where: { id }, data: { ...dto, title: dto.organization || existing.title, nextFollowupAt: dto.nextFollowupAt ? new Date(dto.nextFollowupAt) : undefined } as any });
    await this.prisma.activity.create({ data: { type: 'NOTE', summary: 'Lead updated', userId: user.sub, leadId: lead.id } });
    return lead;
  }

  async softDelete(id: string, user: AuthUser) {
    const existing = await this.prisma.lead.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Lead not found');
    if (existing.deletedAt) return existing;

    const lead = await this.prisma.lead.update({
      where: { id },
      data: { deletedAt: new Date(), deletedById: user.sub }
    });
    await this.prisma.activity.create({ data: { type: 'NOTE', summary: 'Lead marked deleted', userId: user.sub, leadId: lead.id } });
    await this.prisma.auditLog.create({ data: { actorId: user.sub, action: 'DELETE_LEAD', entity: 'Lead', entityId: lead.id, metadata: { organization: lead.organization } } });
    return lead;
  }

  async convertToClient(id: string, user: AuthUser) {
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
    return updated;
  }

  async duplicateWarnings() {
    return this.prisma.lead.findMany({ where: { duplicateReason: { not: null } }, orderBy: { createdAt: 'desc' }, take: 50 });
  }
}
