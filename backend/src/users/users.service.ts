import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ResetUserPasswordDto } from './dto/reset-user-password.dto';
import { ConnectEmailAccountDto } from './dto/connect-email-account.dto';

const fullAccessRoles: Role[] = ['OWNER', 'MANAGER'];

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}


  directory() {
    return this.prisma.user.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, name: true, loginId: true, role: true, emailAddress: true },
      orderBy: { name: 'asc' }
    });
  }

  list() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        loginId: true,
        email: true,
        emailAddress: true,
        role: true,
        status: true,
        phone: true,
        managerId: true,
        mustChangePassword: true,
        lastLoginAt: true,
        createdAt: true,
        emailAccount: { select: { emailAddress: true, smtpEnabled: true, imapEnabled: true, lastSyncedAt: true } },
        userSessions: { where: { isActive: true }, select: { id: true, ipAddress: true, userAgent: true, createdAt: true, expiresAt: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async create(dto: CreateUserDto, actorId?: string) {
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        loginId: dto.loginId,
        email: dto.email,
        role: dto.role,
        phone: dto.phone,
        managerId: dto.managerId,
        emailAddress: dto.emailAddress || dto.email,
        passwordHash,
        mustChangePassword: true
      },
      select: { id: true, name: true, loginId: true, email: true, role: true, status: true, mustChangePassword: true }
    });

    await this.prisma.auditLog.create({
      data: { actorId, action: 'CREATE_USER', entity: 'User', entityId: user.id, metadata: { loginId: user.loginId, role: user.role } }
    });
    return user;
  }


  async update(id: string, dto: UpdateUserDto, actorId: string) {
    const actor = await this.prisma.user.findUnique({ where: { id: actorId } });
    if (!actor || !fullAccessRoles.includes(actor.role)) throw new ForbiddenException('Only Owner/Manager can update users');
    const target = await this.prisma.user.findUnique({ where: { id } });
    if (!target) throw new NotFoundException('User not found');

    const data: any = {};
    for (const key of ['name', 'email', 'phone', 'emailAddress', 'managerId', 'role', 'status'] as const) {
      if (dto[key] !== undefined) data[key] = dto[key] || null;
    }
    const updated = await this.prisma.user.update({
      where: { id },
      data,
      select: { id: true, name: true, loginId: true, email: true, emailAddress: true, role: true, status: true, phone: true, managerId: true }
    });
    await this.prisma.auditLog.create({ data: { actorId, action: 'UPDATE_USER', entity: 'User', entityId: id, metadata: data } });
    return updated;
  }

  async setStatus(id: string, status: 'ACTIVE' | 'DISABLED', actorId: string) {
    const updated = await this.update(id, { status } as UpdateUserDto, actorId);
    if (status === 'DISABLED') {
      await this.prisma.userSession.updateMany({
        where: { userId: id, isActive: true },
        data: { isActive: false, endedAt: new Date(), endReason: 'FORCE_LOGOUT' }
      });
    }
    return updated;
  }

  async resetPassword(dto: ResetUserPasswordDto, actorId: string) {
    const actor = await this.prisma.user.findUnique({ where: { id: actorId } });
    if (!actor || !fullAccessRoles.includes(actor.role)) throw new ForbiddenException('Only Owner/Manager can reset passwords');

    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user) throw new NotFoundException('User not found');

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({ where: { id: user.id }, data: { passwordHash, mustChangePassword: true } });
    await this.prisma.userSession.updateMany({
      where: { userId: user.id, isActive: true },
      data: { isActive: false, endedAt: new Date(), endReason: 'PASSWORD_CHANGED' }
    });

    if (dto.resetRequestId) {
      await this.prisma.passwordResetRequest.updateMany({
        where: { id: dto.resetRequestId, userId: user.id },
        data: { status: 'COMPLETED', handledById: actorId }
      });
    }

    await this.prisma.auditLog.create({
      data: { actorId, action: 'RESET_PASSWORD', entity: 'User', entityId: user.id }
    });
    return { ok: true, message: 'Password reset. The user must login with the new password.' };
  }

  async forceLogout(userId: string, actorId: string) {
    await this.prisma.userSession.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false, endedAt: new Date(), endReason: 'FORCE_LOGOUT' }
    });
    await this.prisma.auditLog.create({ data: { actorId, action: 'FORCE_LOGOUT', entity: 'User', entityId: userId } });
    return { ok: true };
  }

  passwordResetRequests() {
    return this.prisma.passwordResetRequest.findMany({
      where: { status: 'PENDING' },
      include: { user: { select: { id: true, name: true, loginId: true, role: true } } },
      orderBy: { createdAt: 'desc' }
    });
  }

  async connectEmailAccount(dto: ConnectEmailAccountDto, actorId: string) {
    // MVP note: replace this reversible placeholder with KMS encryption before production.
    const encryptedPass = Buffer.from(dto.password, 'utf8').toString('base64');
    const account = await this.prisma.emailAccount.upsert({
      where: { userId: dto.userId },
      update: {
        emailAddress: dto.emailAddress,
        smtpHost: dto.smtpHost || 'smtp.hostinger.com',
        smtpPort: dto.smtpPort || 465,
        imapHost: dto.imapHost || 'imap.hostinger.com',
        imapPort: dto.imapPort || 993,
        encryptedPass,
        smtpEnabled: true,
        imapEnabled: true
      },
      create: {
        userId: dto.userId,
        emailAddress: dto.emailAddress,
        smtpHost: dto.smtpHost || 'smtp.hostinger.com',
        smtpPort: dto.smtpPort || 465,
        imapHost: dto.imapHost || 'imap.hostinger.com',
        imapPort: dto.imapPort || 993,
        encryptedPass
      }
    });
    await this.prisma.user.update({ where: { id: dto.userId }, data: { emailAddress: dto.emailAddress } });
    await this.prisma.auditLog.create({
      data: { actorId, action: 'CONNECT_EMAIL_ACCOUNT', entity: 'EmailAccount', entityId: account.id, metadata: { userId: dto.userId, emailAddress: dto.emailAddress } }
    });
    return { ok: true, account: { id: account.id, emailAddress: account.emailAddress, smtpEnabled: account.smtpEnabled, imapEnabled: account.imapEnabled } };
  }
}
