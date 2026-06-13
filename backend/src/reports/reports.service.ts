import { BadRequestException, Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

type AuthUser = { sub: string; role: Role };
type ReportFilters = { dateFrom?: string; dateTo?: string; employeeId?: string; source?: string; status?: string; productInterest?: string; region?: string };

function monthKey(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}`;
}

function csvCell(value: unknown) {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  private isFullAccess(user: AuthUser) { return ['OWNER', 'MANAGER'].includes(user.role); }
  private leadScope(user: AuthUser) { return this.isFullAccess(user) ? {} : { OR: [{ assignedToId: user.sub }, { createdById: user.sub }] }; }
  private dealScope(user: AuthUser) { return this.isFullAccess(user) ? {} : { assignedToId: user.sub }; }
  private followupScope(user: AuthUser) { return ['OWNER', 'MANAGER', 'PA_ADMIN_ASSISTANT'].includes(user.role) ? {} : { assignedToId: user.sub }; }

  async overview(user: AuthUser, filters: ReportFilters = {}) {
    const employeeId = this.isFullAccess(user) ? filters.employeeId : user.sub;
    const dateRange = {
      ...(filters.dateFrom ? { gte: new Date(`${filters.dateFrom}T00:00:00`) } : {}),
      ...(filters.dateTo ? { lt: new Date(new Date(`${filters.dateTo}T00:00:00`).getTime() + 86400000) } : {})
    };
    const leadFilters: any = {
      ...(Object.keys(dateRange).length ? { createdAt: dateRange } : {}),
      ...(employeeId ? { assignedToId: employeeId } : {}),
      ...(filters.source ? { source: filters.source } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.productInterest ? { requirement: { contains: filters.productInterest, mode: 'insensitive' } } : {}),
      ...(filters.region ? { OR: [{ city: { contains: filters.region, mode: 'insensitive' } }, { state: { contains: filters.region, mode: 'insensitive' } }] } : {})
    };
    const leadScope = this.leadScope(user);
    const leadWhere = { AND: [leadScope, leadFilters] } as any;
    const dealWhere = {
      AND: [
        this.dealScope(user),
        {
          ...(Object.keys(dateRange).length ? { createdAt: dateRange } : {}),
          ...(employeeId ? { assignedToId: employeeId } : {})
        }
      ]
    } as any;
    const followupWhere = {
      AND: [
        this.followupScope(user),
        {
          ...(Object.keys(dateRange).length ? { createdAt: dateRange } : {}),
          ...(employeeId ? { assignedToId: employeeId } : {})
        }
      ]
    } as any;
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5, 1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const [leads, deals, followups, activities, calls, emails, whatsapp, imports, users] = await Promise.all([
      this.prisma.lead.findMany({
        where: leadWhere,
        select: { id: true, status: true, source: true, expectedValue: true, assignedToId: true, createdAt: true }
      }),
      this.prisma.deal.findMany({
        where: dealWhere,
        select: { id: true, stage: true, expectedValue: true, probability: true, assignedToId: true, clientId: true, createdAt: true }
      }),
      this.prisma.followup.findMany({
        where: followupWhere,
        select: { id: true, status: true, assignedToId: true, createdAt: true, updatedAt: true }
      }),
      this.prisma.activity.findMany({
        where: {
          createdAt: { gte: sixMonthsAgo },
          ...(employeeId ? { userId: employeeId } : {}),
          ...(Object.keys(dateRange).length ? { createdAt: dateRange } : {})
        },
        select: { type: true, userId: true, createdAt: true }
      }),
      this.prisma.callLog.findMany({
        where: { ...(employeeId ? { employeeId } : {}), ...(Object.keys(dateRange).length ? { createdAt: dateRange } : {}) },
        select: { employeeId: true, createdAt: true }
      }),
      this.prisma.emailMessage.findMany({
        where: { direction: 'OUTBOUND', ...(employeeId ? { senderUserId: employeeId } : {}), ...(Object.keys(dateRange).length ? { createdAt: dateRange } : {}) },
        select: { senderUserId: true, createdAt: true }
      }),
      this.prisma.whatsappLog.findMany({
        where: { ...(employeeId ? { employeeId } : {}), ...(Object.keys(dateRange).length ? { createdAt: dateRange } : {}) },
        select: { employeeId: true, createdAt: true }
      }),
      this.prisma.excelImport.findMany({
        where: this.isFullAccess(user) ? {} : { uploadedById: user.sub },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { uploadedBy: { select: { name: true, loginId: true } } }
      }),
      this.prisma.user.findMany({
        where: this.isFullAccess(user) ? { status: 'ACTIVE', ...(employeeId ? { id: employeeId } : {}) } : { id: user.sub },
        select: { id: true, name: true, role: true }
      })
    ]);

    const converted = leads.filter((lead) => lead.status === 'CONVERTED').length;
    const lost = leads.filter((lead) => lead.status === 'LOST').length;
    const pipelineValue = deals.reduce((sum, deal) => sum + Number(deal.expectedValue || 0), 0);
    const weightedPipeline = deals.reduce((sum, deal) => sum + Number(deal.expectedValue || 0) * Number(deal.probability || 0) / 100, 0);
    const convertedRevenue = deals.filter((deal) => deal.stage === 'CONVERTED').reduce((sum, deal) => sum + Number(deal.expectedValue || 0), 0);
    const convertedClients = new Set(deals.filter((deal) => deal.stage === 'CONVERTED' && deal.clientId).map((deal) => deal.clientId)).size;

    const sourceMap = new Map<string, { total: number; converted: number }>();
    for (const lead of leads) {
      const source = lead.source || 'Unknown';
      const row = sourceMap.get(source) || { total: 0, converted: 0 };
      row.total += 1;
      if (lead.status === 'CONVERTED') row.converted += 1;
      sourceMap.set(source, row);
    }

    const trendMap = new Map<string, { activity: number; followupCompleted: number; followupPending: number; calls: number; emails: number; whatsapp: number }>();
    const trendRow = (date: Date) => {
      const key = monthKey(date);
      if (!trendMap.has(key)) trendMap.set(key, { activity: 0, followupCompleted: 0, followupPending: 0, calls: 0, emails: 0, whatsapp: 0 });
      return trendMap.get(key)!;
    };
    activities.forEach((item) => trendRow(item.createdAt).activity++);
    followups.forEach((item) => {
      const row = trendRow(item.updatedAt);
      if (item.status === 'COMPLETED') row.followupCompleted++;
      if (item.status === 'PENDING') row.followupPending++;
    });
    calls.forEach((item) => trendRow(item.createdAt).calls++);
    emails.forEach((item) => trendRow(item.createdAt).emails++);
    whatsapp.forEach((item) => trendRow(item.createdAt).whatsapp++);

    const employeePerformance = users.map((member) => {
      const assigned = leads.filter((lead) => lead.assignedToId === member.id);
      return {
        userId: member.id,
        name: member.name,
        role: member.role,
        assignedLeads: assigned.length,
        convertedLeads: assigned.filter((lead) => lead.status === 'CONVERTED').length,
        activities: activities.filter((item) => item.userId === member.id).length,
        calls: calls.filter((item) => item.employeeId === member.id).length,
        emails: emails.filter((item) => item.senderUserId === member.id).length,
        whatsapp: whatsapp.filter((item) => item.employeeId === member.id).length
      };
    });

    const lostAudit = await this.prisma.auditLog.findMany({
      where: {
        entity: 'Lead',
        entityId: { in: leads.map((lead) => lead.id) },
        action: 'UPDATE_LEAD_STAGE',
        afterState: { path: ['status'], equals: 'LOST' }
      },
      select: { notes: true }
    });
    const lostReasons = Array.from(lostAudit.reduce((map, row) => {
      const reason = row.notes?.trim() || 'Not specified';
      map.set(reason, (map.get(reason) || 0) + 1);
      return map;
    }, new Map<string, number>())).map(([reason, count]) => ({ reason, count }));

    return {
      leads: leads.length,
      deals: deals.length,
      pendingFollowups: followups.filter((item) => item.status === 'PENDING').length,
      completedFollowups: followups.filter((item) => item.status === 'COMPLETED').length,
      lostLeads: lost,
      conversionRate: leads.length ? Number((converted / leads.length * 100).toFixed(1)) : 0,
      revenuePipeline: pipelineValue,
      weightedPipeline: Number(weightedPipeline.toFixed(2)),
      leadSource: Array.from(sourceMap).map(([source, row]) => ({ source, ...row, conversionRate: row.total ? Number((row.converted / row.total * 100).toFixed(1)) : 0 })),
      stage: Object.entries(leads.reduce((map: Record<string, number>, lead) => ({ ...map, [lead.status]: (map[lead.status] || 0) + 1 }), {})).map(([status, count]) => ({ status, count })),
      employeePerformance,
      monthlyTrend: Array.from(trendMap).sort(([a], [b]) => a.localeCompare(b)).map(([month, row]) => ({ month, ...row })),
      communicationSummary: { calls: calls.length, emails: emails.length, whatsapp: whatsapp.length },
      lostReasons,
      imports,
      advancedMetrics: {
        ltv: convertedClients ? Number((convertedRevenue / convertedClients).toFixed(2)) : null,
        cac: null,
        cagr: null,
        mrr: null,
        arr: null,
        unavailableReason: 'Insufficient cost, recurring revenue, and multi-year revenue data'
      },
      filters: {
        employees: users,
        sources: Array.from(new Set(leads.map((lead) => lead.source).filter(Boolean))),
        applied: filters
      }
    };
  }

  async monthlyExport(user: AuthUser, month: string) {
    if (!/^\d{4}-\d{2}$/.test(month)) throw new BadRequestException('Month must use YYYY-MM format');
    const [year, monthNumber] = month.split('-').map(Number);
    const start = new Date(year, monthNumber - 1, 1);
    const end = new Date(year, monthNumber, 1);
    const leadWhere = { ...this.leadScope(user), createdAt: { gte: start, lt: end } } as any;
    const dealWhere = { ...this.dealScope(user), createdAt: { gte: start, lt: end } } as any;
    const followupWhere = { ...this.followupScope(user), createdAt: { gte: start, lt: end } } as any;

    const [leads, deals, followups, activities, calls, emails, whatsapp] = await Promise.all([
      this.prisma.lead.findMany({ where: leadWhere, include: { createdBy: { select: { name: true } }, assignedTo: { select: { name: true } } } }),
      this.prisma.deal.findMany({ where: dealWhere, include: { assignedTo: { select: { name: true } } } }),
      this.prisma.followup.findMany({ where: followupWhere, include: { assignedTo: { select: { name: true } }, lead: { select: { organization: true } } } }),
      this.prisma.activity.findMany({ where: { createdAt: { gte: start, lt: end }, ...(this.isFullAccess(user) ? {} : { userId: user.sub }) }, include: { user: { select: { name: true } } } }),
      this.prisma.callLog.findMany({ where: { createdAt: { gte: start, lt: end }, ...(this.isFullAccess(user) ? {} : { employeeId: user.sub }) } }),
      this.prisma.emailMessage.findMany({ where: { createdAt: { gte: start, lt: end }, direction: 'OUTBOUND', ...(this.isFullAccess(user) ? {} : { senderUserId: user.sub }) } }),
      this.prisma.whatsappLog.findMany({ where: { createdAt: { gte: start, lt: end }, ...(this.isFullAccess(user) ? {} : { employeeId: user.sub }) } })
    ]);

    const rows: string[][] = [['SECTION', 'DATE', 'NAME', 'STATUS/TYPE', 'OWNER', 'VALUE', 'DETAILS']];
    leads.forEach((item) => rows.push(['LEAD', item.createdAt.toISOString(), item.organization, item.status, item.assignedTo?.name || '', String(item.expectedValue || ''), item.source || '']));
    deals.forEach((item) => rows.push(['DEAL', item.createdAt.toISOString(), item.title, item.stage, item.assignedTo?.name || '', String(item.expectedValue || ''), `Probability ${item.probability || 0}%`]));
    followups.forEach((item) => rows.push(['FOLLOWUP', item.createdAt.toISOString(), item.lead?.organization || item.title, item.status, item.assignedTo.name, '', item.notes || '']));
    activities.forEach((item) => rows.push(['ACTIVITY', item.createdAt.toISOString(), item.summary, item.type, item.user.name, '', item.details || '']));
    calls.forEach((item) => rows.push(['COMMUNICATION', item.createdAt.toISOString(), item.clientName || item.phone, 'CALL', item.employeeId, String(item.durationSeconds || ''), item.summary || '']));
    emails.forEach((item) => rows.push(['COMMUNICATION', item.createdAt.toISOString(), item.toEmail, 'EMAIL', item.senderUserId || '', '', item.subject]));
    whatsapp.forEach((item) => rows.push(['COMMUNICATION', item.createdAt.toISOString(), item.phone, 'WHATSAPP', item.employeeId, '', item.message]));
    return rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
  }

  available() {
    return ['Team performance', 'Lead source', 'Follow-up pending', 'Follow-up trend', 'Conversion', 'Revenue pipeline', 'Employee activity', 'Excel import', 'Lost lead', 'Communication activity', 'Advanced business metrics'];
  }
}
