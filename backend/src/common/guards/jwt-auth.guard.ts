import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { PrismaService } from '../../database/prisma.service';

function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

function jwtSecret(config: ConfigService) {
  const secret = config.get<string>('JWT_SECRET');
  if (!secret) throw new UnauthorizedException('Authentication is not configured');
  return secret;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private jwt: JwtService, private config: ConfigService, private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : req.cookies?.access_token;
    if (!token) throw new UnauthorizedException('Missing token');

    try {
      const payload = this.jwt.verify(token, { secret: jwtSecret(this.config) });
      if (!payload.sessionId || !payload.sessionSecret) throw new UnauthorizedException('Invalid session');

      const session = await this.prisma.userSession.findFirst({
        where: {
          id: payload.sessionId,
          userId: payload.sub,
          tokenHash: sha256(payload.sessionSecret),
          isActive: true,
          expiresAt: { gt: new Date() },
          user: { status: 'ACTIVE' }
        },
        include: { user: { select: { id: true, name: true, loginId: true, email: true, emailAddress: true, role: true, status: true } } }
      });
      if (!session) throw new UnauthorizedException('Session expired, user disabled, or logged in elsewhere');

      req.user = { ...payload, user: session.user };
      return true;
    } catch (e) {
      if (e instanceof UnauthorizedException) throw e;
      throw new UnauthorizedException('Invalid token');
    }
  }
}
