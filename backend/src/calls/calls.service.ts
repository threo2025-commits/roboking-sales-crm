import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileCategory } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { FilesService } from '../files/files.service';
import { validateCallRecording } from './call-recording.validation';
import { CreateCallLogDto } from './dto/create-call-log.dto';

@Injectable()
export class CallsService {
  constructor(private prisma: PrismaService, private files: FilesService, private config: ConfigService) {}

  private unrestricted(role: string) { return ['OWNER', 'MANAGER'].includes(role); }

  private accessibleLeadWhere(user: { sub: string; role: string }) {
    return this.unrestricted(user.role) ? {} : { OR: [{ assignedToId: user.sub }, { createdById: user.sub }] };
  }

  private accessibleClientWhere(user: { sub: string; role: string }) {
    if (this.unrestricted(user.role)) return {};
    return {
      OR: [
        { createdById: user.sub },
        { leads: { some: { OR: [{ assignedToId: user.sub }, { createdById: user.sub }] } } },
        { deals: { some: { assignedToId: user.sub } } }
      ]
    };
  }

  private async assertEntityAccess(dto: CreateCallLogDto, user: { sub: string; role: string }) {
    if (!dto.leadId && !dto.clientId && !dto.dealId) {
      throw new BadRequestException('Call log must be linked to at least one lead, client, or deal');
    }

    if (dto.leadId) {
      const lead = await this.prisma.lead.findFirst({ where: { id: dto.leadId, ...this.accessibleLeadWhere(user) } });
      if (!lead) throw new ForbiddenException('You can log calls only for your own/assigned leads');
    }

    if (dto.clientId) {
      const client = await this.prisma.client.findFirst({ where: { id: dto.clientId, ...this.accessibleClientWhere(user) } });
      if (!client) throw new ForbiddenException('You can log calls only for your own/assigned clients');
    }

    if (dto.dealId) {
      const deal = await this.prisma.deal.findFirst({ where: { id: dto.dealId, ...(this.unrestricted(user.role) ? {} : { assignedToId: user.sub }) } });
      if (!deal) throw new ForbiddenException('You can log calls only for your own/assigned deals');
    }
  }

  async create(dto: CreateCallLogDto, user: { sub: string; role: string }, recording?: Express.Multer.File) {
    if (!recording) throw new BadRequestException('Call recording upload is mandatory');
    validateCallRecording(recording, Number(this.config.get<string>('MAX_CALL_RECORDING_BYTES') || this.config.get<string>('MAX_UPLOAD_BYTES') || 50 * 1024 * 1024));
    await this.assertEntityAccess(dto, user);
    const asset = await this.files.uploadBuffer({ file: recording, category: FileCategory.CALL_RECORDING, uploadedById: user.sub, leadId: dto.leadId });
    const call = await this.prisma.callLog.create({
      data: {
        leadId: dto.leadId,
        clientId: dto.clientId,
        dealId: dto.dealId,
        employeeId: user.sub,
        createdById: user.sub,
        phone: dto.phone,
        clientName: dto.clientName,
        status: dto.status,
        durationSeconds: dto.durationSeconds,
        summary: dto.summary,
        objectionReason: dto.objectionReason,
        budgetDiscussed: dto.budgetDiscussed,
        productInterest: dto.productInterest,
        nextFollowupAt: dto.nextFollowupAt ? new Date(dto.nextFollowupAt) : undefined,
        recordingFileId: asset.id
      }
    });
    await this.prisma.activity.create({ data: { type: 'CALL', summary: `Call logged: ${dto.status}`, details: dto.summary, userId: user.sub, leadId: dto.leadId, clientId: dto.clientId, dealId: dto.dealId } });
    return call;
  }
}
