import { Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

type AuthUser = { sub: string; role: Role };

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async summary(user: AuthUser) {
    const unrestricted = ['OWNER', 'MANAGER'].includes(user.role);
    const leadWhere = unrestricted ? {} : { OR: [{ assignedToId: user.sub }, { createdById: user.sub }] };
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const dealWhere = unrestricted ? {} : { assignedToId: user.sub };
    const [totalLeads, activeDeals, followupsToday, duplicateContacts, convertedLeads, pipeline] = await Promise.all([
      this.prisma.lead.count({ where: leadWhere as any }),
      this.prisma.deal.count({ where: dealWhere as any }),
      this.prisma.followup.count({ where: { dueAt: { gte: todayStart, lt: todayEnd }, ...(unrestricted ? {} : { assignedToId: user.sub }) } }),
      this.prisma.lead.count({ where: { duplicateReason: { not: null } } }),
      this.prisma.lead.count({ where: { ...(leadWhere as any), status: 'CONVERTED' } }),
      this.prisma.deal.aggregate({ where: dealWhere as any, _sum: { expectedValue: true } })
    ]);

    return {
      totalLeads,
      activeDeals,
      followupsToday,
      conversionRate: totalLeads ? Number(((convertedLeads / totalLeads) * 100).toFixed(1)) : 0,
      revenuePipeline: Number(pipeline._sum.expectedValue || 0),
      duplicateContacts,
      warnings: duplicateContacts > 0 ? ['Duplicate contact found'] : []
    };
  }
}
