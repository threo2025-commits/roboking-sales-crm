import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { createHash, randomUUID } from 'crypto';
import { PrismaService } from '../database/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

function jwtSecret(config: ConfigService) {
  const secret = config.get<string>('JWT_SECRET');
  if (!secret) throw new UnauthorizedException('Authentication is not configured');
  return secret;
}

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService, private config: ConfigService) {}

  async login(dto: LoginDto, meta?: { ipAddress?: string; userAgent?: string }) {
    const user = await this.prisma.user.findUnique({ where: { loginId: dto.loginId } });
    if (!user || user.status !== 'ACTIVE') throw new UnauthorizedException('Invalid login');

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid login');

    const activeSession = await this.prisma.userSession.findFirst({
      where: { userId: user.id, isActive: true, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' }
    });
    if (activeSession) {
      throw new ConflictException('This account is already active on another device. Contact Owner/Manager to force logout.');
    }

    const rawSessionSecret = randomUUID();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 12);
    const session = await this.prisma.userSession.create({
      data: {
        userId: user.id,
        tokenHash: sha256(rawSessionSecret),
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
        expiresAt
      }
    });

    const payload = {
      sub: user.id,
      sessionId: session.id,
      sessionSecret: rawSessionSecret,
      loginId: user.loginId,
      email: user.email,
      role: user.role,
      name: user.name
    };
    const accessToken = await this.jwt.signAsync(payload, {
      secret: jwtSecret(this.config),
      expiresIn: this.config.get<string>('JWT_EXPIRES_IN') || '12h'
    });

    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await this.prisma.auditLog.create({
      data: {
        actorId: user.id,
        actorRole: user.role,
        action: 'LOGIN',
        entity: 'UserSession',
        entityId: session.id,
        entityName: user.loginId,
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
        metadata: { loginId: user.loginId }
      }
    });

    return {
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        loginId: user.loginId,
        email: user.email,
        role: user.role,
        mustChangePassword: user.mustChangePassword
      }
    };
  }


  async me(userId: string, sessionId?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, loginId: true, email: true, emailAddress: true, role: true, status: true, mustChangePassword: true, lastLoginAt: true }
    });
    if (!user || user.status !== 'ACTIVE') throw new UnauthorizedException('User disabled or not found');
    return { user, sessionId };
  }

  async logout(user?: { sub?: string; sessionId?: string }) {
    if (user?.sessionId) {
      await this.prisma.userSession.updateMany({
        where: { id: user.sessionId, userId: user.sub, isActive: true },
        data: { isActive: false, endedAt: new Date(), endReason: 'LOGOUT' }
      });
    }
    return { ok: true };
  }

  async requestPasswordReset(dto: RequestPasswordResetDto) {
    const user = await this.prisma.user.findUnique({ where: { loginId: dto.loginId } });
    if (!user) return { ok: true, message: 'If the login ID exists, the request has been sent to Owner/Manager.' };

    await this.prisma.passwordResetRequest.create({ data: { userId: user.id, reason: dto.reason } });
    return { ok: true, message: 'Password reset request sent to Owner/Manager.' };
  }

  async changeOwnPassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    const ok = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Current password is incorrect');

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash, mustChangePassword: false } });
    await this.prisma.userSession.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false, endedAt: new Date(), endReason: 'PASSWORD_CHANGED' }
    });
    return { ok: true, message: 'Password changed. Please login again.' };
  }
}
