import { Injectable } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async list() {
    const rows = await this.prisma.setting.findMany({ where: { key: { not: 'ADMIN_BCC_EMAIL' } }, orderBy: { key: 'asc' } });
    return { ALLOW_EMPLOYEE_DIRECT_CHAT: 'false', ...Object.fromEntries(rows.map((r) => [r.key, r.value])) };
  }

  async upsert(key: string, value: string, actorId?: string) {
    if (key === 'ADMIN_BCC_EMAIL') throw new BadRequestException('This system setting is managed securely by the backend');
    const setting = await this.prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
    await this.prisma.auditLog.create({ data: { actorId, action: 'UPDATE_SETTING', entity: 'Setting', entityId: key, metadata: { key } } });
    return setting;
  }
}
