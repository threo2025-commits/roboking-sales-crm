import { Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';

type AuthUser = { sub: string; role: Role };

@Injectable()
export class ClientsService {
  constructor(private prisma: PrismaService) {}

  list(user: AuthUser) {
    const unrestricted = ['OWNER', 'MANAGER'].includes(user.role);
    return this.prisma.client.findMany({
      where: unrestricted ? {} : { OR: [{ createdById: user.sub }, { leads: { some: { OR: [{ assignedToId: user.sub }, { createdById: user.sub }] } } }, { deals: { some: { assignedToId: user.sub } } }] },
      include: { contacts: true, leads: { take: 3, orderBy: { createdAt: 'desc' } }, deals: { take: 3, orderBy: { updatedAt: 'desc' } }, callLogs: { include: { recordingFile: true, employee: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' }, take: 5 } },
      orderBy: { updatedAt: 'desc' },
      take: 200
    });
  }

  get(id: string, user: AuthUser) {
    const unrestricted = ['OWNER', 'MANAGER'].includes(user.role);
    return this.prisma.client.findFirst({
      where: { id, ...(unrestricted ? {} : { OR: [{ createdById: user.sub }, { leads: { some: { OR: [{ assignedToId: user.sub }, { createdById: user.sub }] } } }, { deals: { some: { assignedToId: user.sub } } }] }) },
      include: { contacts: true, leads: true, deals: true, activities: { orderBy: { createdAt: 'desc' }, take: 50 }, callLogs: { include: { recordingFile: true, employee: { select: { id: true, name: true } }, lead: true, deal: true }, orderBy: { createdAt: 'desc' } } }
    });
  }

  async create(dto: CreateClientDto, user: AuthUser) {
    const client = await this.prisma.client.create({
      data: {
        organization: dto.organization,
        category: dto.category,
        city: dto.city,
        state: dto.state,
        source: dto.source,
        website: dto.website,
        notes: dto.notes,
        createdById: user.sub,
        contacts: dto.contactName || dto.phone || dto.email ? {
          create: { name: dto.contactName || 'Primary Contact', designation: dto.designation, phone: dto.phone, whatsapp: dto.whatsapp, email: dto.email }
        } : undefined
      },
      include: { contacts: true }
    });
    await this.prisma.activity.create({ data: { type: 'NOTE', summary: 'Client created', userId: user.sub, clientId: client.id } });
    return client;
  }
}
