import { Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

type AuthUser = { sub: string; role: Role };

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  private isFullAccess(user: AuthUser) { return ['OWNER', 'MANAGER'].includes(user.role); }
  private leadScope(user: AuthUser) { return this.isFullAccess(user) ? {} : { OR: [{ assignedToId: user.sub }, { createdById: user.sub }] }; }
  private dealScope(user: AuthUser) { return this.isFullAccess(user) ? {} : { assignedToId: user.sub }; }
  private followupScope(user: AuthUser) { return ['OWNER', 'MANAGER', 'PA_ADMIN_ASSISTANT'].includes(user.role) ? {} : { assignedToId: user.sub }; }

  async overview(user: AuthUser) {
    const leadWhere = this.leadScope(user) as any;
    const dealWhere = this.dealScope(user) as any;
    const followupWhere = this.followupScope(user) as any;
    const [leads, deals, pendingFollowups, imports, lostLeads] = await Promise.all([
      this.prisma.lead.count({ where: leadWhere }),
      this.prisma.deal.count({ where: dealWhere }),
      this.prisma.followup.count({ where: { status: 'PENDING', ...followupWhere } }),
      this.prisma.excelImport.findMany({
        where: this.isFullAccess(user) ? {} : { uploadedById: user.sub },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { uploadedBy: { select: { name: true, loginId: true } } }
      }),
      this.prisma.lead.count({ where: { status: 'LOST', ...leadWhere } })
    ]);
    const leadSource = await this.prisma.lead.groupBy({ by: ['source'], where: leadWhere, _count: { id: true }, orderBy: { _count: { id: 'desc' } } });
    const stage = await this.prisma.lead.groupBy({ by: ['status'], where: leadWhere, _count: { id: true } });
    const employeeActivity = this.isFullAccess(user)
      ? await this.prisma.activity.groupBy({ by: ['userId'], _count: { id: true }, orderBy: { _count: { id: 'desc' } }, take: 20 })
      : await this.prisma.activity.groupBy({ by: ['userId'], where: { userId: user.sub }, _count: { id: true }, orderBy: { _count: { id: 'desc' } }, take: 20 });
    return { leads, deals, pendingFollowups, lostLeads, leadSource, stage, employeeActivity, imports };
  }

  available() {
    return ['Team performance', 'Lead source', 'Follow-up pending', 'Conversion', 'Revenue pipeline', 'Employee activity', 'Excel import', 'Lost lead'];
  }
}
