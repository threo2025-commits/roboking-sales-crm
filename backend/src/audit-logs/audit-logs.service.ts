import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class AuditLogsService {
  constructor(private prisma: PrismaService) {}

  list() {
    return this.prisma.auditLog.findMany({
      include: { actor: { select: { id: true, name: true, loginId: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      take: 300
    });
  }
}
