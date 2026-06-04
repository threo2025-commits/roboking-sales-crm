import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { WhatsappTemplateDto } from './dto/whatsapp-template.dto';

@Injectable()
export class WhatsappService {
  constructor(private prisma: PrismaService) {}

  createUrl(phone: string, message: string) {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  }

  async createAndLogUrl(phone: string, message: string, userId: string, leadId?: string) {
    const url = this.createUrl(phone, message);
    await this.prisma.whatsappLog.create({ data: { phone, message, waUrl: url, employeeId: userId, leadId } }).catch(() => null);
    return { url };
  }

  templates() { return this.prisma.whatsappTemplate.findMany({ where: { isActive: true }, orderBy: { createdAt: 'desc' } }); }

  async createTemplate(dto: WhatsappTemplateDto, userId: string) {
    const template = await this.prisma.whatsappTemplate.create({ data: { ...dto, isActive: dto.isActive ?? true } });
    await this.prisma.auditLog.create({ data: { actorId: userId, action: 'CREATE_WHATSAPP_TEMPLATE', entity: 'WhatsappTemplate', entityId: template.id } });
    return template;
  }

  async updateTemplate(id: string, dto: Partial<WhatsappTemplateDto>, userId: string) {
    const template = await this.prisma.whatsappTemplate.update({ where: { id }, data: dto });
    await this.prisma.auditLog.create({ data: { actorId: userId, action: 'UPDATE_WHATSAPP_TEMPLATE', entity: 'WhatsappTemplate', entityId: id } });
    return template;
  }
}
