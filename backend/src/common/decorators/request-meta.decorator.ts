import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export type RequestMeta = {
  ipAddress?: string;
  userAgent?: string;
};

export const CurrentRequestMeta = createParamDecorator((_data: unknown, ctx: ExecutionContext): RequestMeta => {
  const request = ctx.switchToHttp().getRequest();
  const forwarded = request.headers['x-forwarded-for'];
  const forwardedIp = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0]?.trim();
  return {
    ipAddress: forwardedIp || request.ip || request.socket?.remoteAddress,
    userAgent: request.headers['user-agent']
  };
});
