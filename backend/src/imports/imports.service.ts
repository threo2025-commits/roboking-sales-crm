import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import * as XLSX from 'xlsx';
import { PrismaService } from '../database/prisma.service';
import { LeadsService } from '../leads/leads.service';
import { CommitImportDto } from './dto/commit-import.dto';

type AuthUser = { sub: string; role: Role };

@Injectable()
export class ImportsService {
  constructor(private prisma: PrismaService, private leads: LeadsService) {}

  async preview(file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Excel file is required');
    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const sourceRows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });
    const rows = [];
    for (const [idx, row] of sourceRows.entries()) {
      const data = this.mapRow(row);
      const duplicate = await this.leads.findDuplicate({ phone: data.phone, email: data.email });
      const status = !data.organization ? 'FAILED' : duplicate ? 'DUPLICATE' : 'VALID';
      rows.push({
        rowNumber: idx + 2,
        status,
        data,
        duplicate: duplicate ? { id: duplicate.id, type: duplicate.type, organization: duplicate.organization, phone: duplicate.phone, email: duplicate.email } : undefined,
        error: !data.organization ? 'Organization/company name is required' : undefined
      });
    }
    return { totalRows: rows.length, duplicateRows: rows.filter((r) => r.status === 'DUPLICATE').length, failedRows: rows.filter((r) => r.status === 'FAILED').length, rows };
  }

  async commit(dto: CommitImportDto, user: AuthUser) {
    const isOverrideAllowed = ['OWNER', 'MANAGER'].includes(user.role) && dto.allowDuplicateOverride;
    const duplicateRows = dto.rows.filter((r) => r.status === 'DUPLICATE').length;
    const invalidRows = dto.rows.filter((r) => r.status === 'FAILED').length;
    const excelImport = await this.prisma.excelImport.create({ data: { fileName: dto.fileName, uploadedById: user.sub, totalRows: dto.rows.length, duplicateRows, failedRows: invalidRows } });
    let importedRows = 0;
    let skippedRows = 0;
    for (const row of dto.rows) {
      let finalStatus: any = row.status;
      let error = row.error;
      try {
        if (row.status === 'VALID' || (row.status === 'DUPLICATE' && isOverrideAllowed)) {
          const importedLead = await this.leads.create({ ...row.data, allowDuplicateOverride: isOverrideAllowed } as any, user, { sourceImportId: excelImport.id });
          (row as any).importedLeadId = importedLead.id;
          finalStatus = 'IMPORTED';
          importedRows++;
        } else if (row.status === 'DUPLICATE') {
          finalStatus = 'DUPLICATE';
          error = 'Duplicate contact found';
          skippedRows++;
        } else {
          finalStatus = 'FAILED';
          error = row.error || 'Invalid row skipped';
          skippedRows++;
        }
      } catch (e: any) {
        finalStatus = 'FAILED';
        error = e.message || 'Import failed';
        skippedRows++;
      }
      await this.prisma.excelImportRow.create({ data: { importId: excelImport.id, rowNumber: row.rowNumber, rawJson: row.data, status: finalStatus, error, duplicateLeadId: row.duplicate?.id, importedLeadId: (row as any).importedLeadId } });
    }
    await this.prisma.excelImport.update({ where: { id: excelImport.id }, data: { importedRows } });
    await this.prisma.auditLog.create({ data: { actorId: user.sub, action: 'COMMIT_EXCEL_IMPORT', entity: 'ExcelImport', entityId: excelImport.id, metadata: { fileName: dto.fileName, importedRows, duplicateRows, invalidRows, skippedRows } } });
    return { ok: true, importId: excelImport.id, totalRows: dto.rows.length, importedRows, duplicateRows, invalidRows, skippedRows };
  }

  history(user: AuthUser) {
    const unrestricted = ['OWNER', 'MANAGER'].includes(user.role);
    return this.prisma.excelImport.findMany({
      where: unrestricted ? {} : { uploadedById: user.sub },
      include: { uploadedBy: { select: { id: true, name: true, loginId: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100
    });
  }

  async deleteImport(importId: string, user: AuthUser) {
    if (!['OWNER', 'MANAGER'].includes(user.role)) throw new ForbiddenException('Only Owner/Manager can delete imported data');
    const importRecord = await this.prisma.excelImport.findUnique({ where: { id: importId } });
    if (!importRecord) throw new NotFoundException('Import not found');
    const importedLeads = await this.prisma.lead.findMany({ where: { sourceImportId: importId }, select: { id: true } });
    const leadIds = importedLeads.map((l) => l.id);
    if (leadIds.length) {
      await this.prisma.$transaction([
        this.prisma.followup.updateMany({ where: { leadId: { in: leadIds } }, data: { leadId: null } }),
        this.prisma.task.updateMany({ where: { leadId: { in: leadIds } }, data: { leadId: null } }),
        this.prisma.deal.updateMany({ where: { leadId: { in: leadIds } }, data: { leadId: null } }),
        this.prisma.activity.updateMany({ where: { leadId: { in: leadIds } }, data: { leadId: null } }),
        this.prisma.callLog.updateMany({ where: { leadId: { in: leadIds } }, data: { leadId: null } }),
        this.prisma.emailMessage.updateMany({ where: { leadId: { in: leadIds } }, data: { leadId: null } }),
        this.prisma.whatsappLog.updateMany({ where: { leadId: { in: leadIds } }, data: { leadId: null } }),
        this.prisma.fileAsset.updateMany({ where: { leadId: { in: leadIds } }, data: { leadId: null } }),
        this.prisma.lead.deleteMany({ where: { id: { in: leadIds } } })
      ]);
    }
    await this.prisma.excelImport.delete({ where: { id: importId } });
    await this.prisma.auditLog.create({ data: { actorId: user.sub, action: 'DELETE_EXCEL_IMPORT_DATA', entity: 'ExcelImport', entityId: importId, metadata: { deletedLeadCount: leadIds.length, fileName: importRecord.fileName } } });
    return { ok: true, deletedLeadCount: leadIds.length };
  }

  private mapRow(row: Record<string, any>) {
    return {
      organization: String(row.Organization || row.organization || row['Company Name'] || row.Company || row.School || '').trim(),
      contactName: String(row['Contact Person'] || row.contactName || row.Name || '').trim(),
      phone: String(row.Phone || row.phone || row.Mobile || '').trim(),
      whatsapp: String(row.WhatsApp || row.whatsapp || row.Phone || '').trim(),
      email: String(row.Email || row.email || '').trim(),
      city: String(row.City || row.city || '').trim(),
      state: String(row.State || row.state || '').trim(),
      requirement: String(row.Requirement || row.requirement || '').trim(),
      source: String(row.Source || row.source || 'Excel Import').trim()
    };
  }
}
